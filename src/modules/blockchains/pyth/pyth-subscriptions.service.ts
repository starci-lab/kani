import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { HermesClient, PriceUpdate } from "@pythnetwork/hermes-client"
import { InjectHermesClient } from "./pyth.decorators"
import { PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import BN from "bn.js"
import { computeDenomination } from "@utils"
import { 
    TokenListIsEmptyException,
    WsConnectionClosedException,
    WsConnectionErrorException,
} from "@exceptions"
import { 
    EventEmitterService, 
    EventName 
} from "@modules/event"
import {
    AsyncService, 
    InjectSuperJson,  
    RetryService,
    DayjsService,
} from "@modules/mixin"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { chunkArray } from "@utils"
import { envConfig } from "@modules/env"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { PythUtilsService } from "./pyth-utils.service"

interface PythTokenPrice {
    tokenId: TokenId
    price: number
}

@Injectable()
export class PythSubscriptionsService implements OnApplicationBootstrap {
    constructor(
        @InjectHermesClient() private readonly hermesClient: HermesClient,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly eventEmitterService: EventEmitterService,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        private readonly pythUtilsService: PythUtilsService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
        private readonly dayjsService: DayjsService,
    ) {}

    onApplicationBootstrap() {
        // fetch the prices and subscribe to the price updates
        this.fetchPrices().then(() => {
            // then we subscribe to the price updates
            this.subscribe()
        })
    }

    async fetchPrices() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => !!token.pythFeedId
            )
        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Pyth tokens found for mainnet")
        }
        const feedIds = this.pythUtilsService.getPythIds()
        // we split the feed ids into chunks of 5
        const chunks = chunkArray(feedIds, 5)
        const prices = await this.asyncService.allIgnoreError(
            chunks.map(
                async (chunk) => {
                    const prices = await this.retryService.retry({
                        action: () => this.hermesClient.getLatestPriceUpdates(chunk),
                        maxRetries: envConfig().timeConfig.retry.maxRetries,
                        delay: envConfig().timeConfig.retry.delay,
                        factor: envConfig().timeConfig.retry.factor,
                    })
                    return prices.parsed
                }))
        const priceData = prices.flat().map(data => {
            const price = computeDenomination(
                new BN(data?.ema_price?.price ?? 0), 
                data?.ema_price?.expo ?? 8
            )
            return {
                feedId: data?.id ?? "",
                price: price.toNumber(),
            }
        }) 
        this.logger.info(
            WinstonLog.PythPricesFetched,
            {
                fetchedCount: priceData.length,
                expectedCount: feedIds.length,
            }
        )
        const tokenList = tokens.map(
            token => {
                const price = priceData.find(data => data.feedId.includes(token.pythFeedId!))
                if (!price) return undefined
                return {
                    tokenId: token.displayId,
                    price: price.price,
                }
            }).filter(Boolean) as Array<PythTokenPrice>
        // cache the prices and emit the event
        await this.asyncService.allIgnoreError([
            // cache the price
            this.cacheManager.mset(
                tokenList.map(
                    data => {
                        return {
                            key: createCacheKey(
                                CacheKey.PythTokenPrice, 
                                data.tokenId
                            ),
                            value: this.superjson.stringify({
                                price: data.price,
                                snapshotAt: this.dayjsService.now(),
                            }),
                            ttl: envConfig().cache.ttl.pythPrice,
                        }
                    }
                ),
            ),
            // emit the event
            ...tokenList.map(
                data => this.eventEmitterService.emit(
                    EventName.WsPythLastPricesUpdated, {
                        tokenId: data.tokenId,
                        price: data.price,
                    }, {
                        withoutLocal: true,
                    })
            ),
        ])
    }

    async subscribe() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => !!token.pythFeedId
            )
        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Pyth tokens found for mainnet")
        }
        // we use new set to avoid duplicate feed IDs
        const feedIds = [...new Set(tokens.map(token => token.pythFeedId!))]
        // seperate into batches of 5
        const batches = chunkArray(feedIds, 5)
        for (const batch of batches) {
        // we split the feed ids into chunks of 5
            this.retryService.retryWs({
                closeFnName: "close",
                // create a new connection each time the retry is called
                createConnection: async () => {
                    return this.hermesClient.getPriceUpdatesStream(batch)
                },
                // register the listener
                onOpen: async (stream, markMessageReceived) => {
                    const promise = new Promise<void>((_, reject) => {
                    // handle the open event
                        stream.addEventListener("open", () => {
                            this.logger.info(WinstonLog.WebsocketConnected, { streamName: "pyth-price-updates" })
                        })
                        // handle the error - reject to signal retryWs reconnect
                        stream.addEventListener("error", (err) => {
                            stream.close()
                            reject(new WsConnectionErrorException(err.message))
                        })
                        // handle the close event - reject to signal retryWs reconnect
                        stream.addEventListener("close", () => {
                            reject(new WsConnectionClosedException("WS closed"))
                        })
                        stream.addEventListener(
                            "message",
                            async (event: MessageEvent<string>) => {
                                try {
                                    const update: PriceUpdate = JSON.parse(event.data)
                                    markMessageReceived?.()
                                    // handle the price updates
                                    for (const priceData of update.parsed ?? []) {
                                    // filter the tokens by the feed id
                                        const filteredTokens = tokens.filter(
                                            token => token.pythFeedId?.includes(priceData.id)
                                        )
            
                                        // if no tokens are found, continue
                                        if (!filteredTokens.length) continue
                                        // compute the price and cache the price and emit the event in parallel
                                        const price = computeDenomination(
                                            new BN(priceData.ema_price.price),
                                            -priceData.ema_price.expo
                                        )
                                        // cache the price and emit the event in parallel
                                        const promises: Array<Promise<void>> = []
                                        // loop through the filtered tokens and cache the price and emit the event in parallel
                                        for (const token of filteredTokens) {
                                        // cache the price
                                            promises.push(
                                                (async () => { 
                                                    await this.cacheManager.set(
                                                        createCacheKey(
                                                            CacheKey.PythTokenPrice,
                                                            token.displayId
                                                        ),
                                                        this.superjson.stringify({
                                                            price: price.toNumber(),
                                                            snapshotAt: this.dayjsService.now(),
                                                        }),
                                                        envConfig().cache.ttl.pythPrice,
                                                    )}
                                                )()
                                            ) 
                                            // emit the event
                                            promises.push(
                                                (async () => {
                                                    await this.eventEmitterService.emit(
                                                        EventName.WsPythLastPricesUpdated,
                                                        {
                                                            tokenId: token.displayId,
                                                            price: price.toNumber(),
                                                        },
                                                        { withoutLocal: true }
                                                    )}
                                                )()
                                            )
                                        }
                                        // wait for all promises to complete
                                        await this.asyncService.allMustDone(promises)
                                    }
                                } catch (error) {
                                    this.logger.error(WinstonLog.WebsocketMessageError, {
                                        error: error.message,
                                    })
                                }
                            }
                        )
                    })
                    return await promise
                }, 
                onReconnect: async (error) => {
                    this.logger.warn(
                        WinstonLog.WebsocketReconnect, 
                        {
                            reason: error?.message,
                            streamName: "pyth-price-updates",
                        })
                },
                onFatal: async () => {
                    this.logger.error(
                        WinstonLog.WebsocketFatalError, {
                            error: "WS connection failed",
                            streamName: "pyth-price-updates",
                        }
                    )
                },
                options: {
                    baseDelay: envConfig().timeConfig.retry.delay,
                    factor: envConfig().timeConfig.retry.factor,
                    maxDelay: envConfig().timeConfig.retry.maxDelay,
                    maxRetries: envConfig().timeConfig.retry.maxRetries,
                    jitter: true,
                },
                throwOnFatal: false,
            })
        }
    }
}