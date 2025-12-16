import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common"
import { HermesClient, PriceUpdate } from "@pythnetwork/hermes-client"
import { InjectHermesClient } from "./pyth.decorators"
import { PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import BN from "bn.js"
import { computeDenomination } from "@utils"
import { 
    TokenListIsEmptyException 
} from "@exceptions"
import { 
    EventEmitterService, 
    EventName 
} from "@modules/event"
import {
    AsyncService, 
    InjectSuperJson, 
    ReadinessWatcherFactoryService, 
    RetryService 
} from "@modules/mixin"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { chunkArray } from "@utils"
import { envConfig } from "@modules/env"

interface PythTokenPrice {
    tokenId: TokenId
    price: number
}

@Injectable()
export class PythService implements OnApplicationBootstrap, OnModuleInit {
    constructor(
        @InjectHermesClient() private readonly hermesClient: HermesClient,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly events: EventEmitterService,
        private readonly asyncService: AsyncService,
        private readonly retryService: RetryService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    async onModuleInit() {
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        // we fetch the prices first to ensure the prices are cached
        await this.fetchPrices()
    }

    async onApplicationBootstrap() {
        // then we subscribe to the price updates
        await this.subscribe()
    }

    async fetchPrices() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => !!token.pythFeedId
            )
        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Pyth tokens found for mainnet")
        }
        const feedIds = [...new Set(tokens.map(token => token.pythFeedId!))]
        // we split the feed ids into chunks of 5
        const chunks = chunkArray(feedIds, 5)
        const prices = await this.asyncService.allMustDone(
            chunks.map(async (chunk) => {
                const prices = await this.retryService.retry({
                    action: () => this.hermesClient.getLatestPriceUpdates(chunk),
                    maxRetries: 3,
                    delay: 1000,
                    factor: 2,
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
        const tokenList = tokens.map(
            token => {
                const price = priceData.find(data => data.feedId.includes(token.pythFeedId!))
                if (!price) return undefined
                return {
                    tokenId: token.displayId,
                    price: price.price,
                }
            }).filter(Boolean) as Array<PythTokenPrice>
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
                            }),
                            ttl: envConfig().cache.ttl.pythTokenPrice,
                        }
                    }),
            ),
            // emit the event
            ...tokenList.map(
                data => this.events.emit(
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
        // we split the feed ids into chunks of 5
        const stream = await this.hermesClient.getPriceUpdatesStream(
            feedIds
        )
        // handle price updates
        stream.addEventListener("message", async (data: MessageEvent<string>) => {
            const update: PriceUpdate = JSON.parse(data.data)
            for (const data of update.parsed ?? []) {
                const filteredTokens = tokens.filter(token => token.pythFeedId?.includes(data.id))
                if (!filteredTokens.length) return
                const price = computeDenomination(new BN(data.ema_price.price), -data.ema_price.expo)
                const promises: Array<Promise<void>> = []
                for (const token of filteredTokens) {
                    promises.push(
                        (async () => {
                            await this.cacheManager.set(
                                createCacheKey(
                                    CacheKey.PythTokenPrice, 
                                    token.displayId
                                ),
                                this.superjson.stringify({
                                    price: price.toNumber(),
                                }),
                                envConfig().cache.ttl.pythTokenPrice,
                            )})())   
                    promises.push((
                        async () => {
                            await this.events.emit(
                                EventName.WsPythLastPricesUpdated, {
                                    tokenId: token.displayId,
                                    price: price.toNumber(),
                                }, {
                                    withoutLocal: true,
                                })
                        })()
                    )
                }
                await this.asyncService.allIgnoreError(promises)
            }
        })
    }
}