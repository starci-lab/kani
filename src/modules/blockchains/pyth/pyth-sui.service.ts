import { PriceFeed, SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js"
import { IOracleService } from "./i-oracle.interface"
import { envConfig } from "@modules/env"
import { TokenId, TokenLike } from "@modules/databases"
import Decimal from "decimal.js"
import { ChainId, computeDenomination, Network } from "@modules/common"
import BN from "bn.js"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { Cache } from "cache-manager"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { InjectWinston } from "@modules/winston"
import { Logger } from "winston"
import { WinstonLog } from "@modules/winston"
import { EventEmitterService, EventName, PythSuiPricesUpdatedEvent } from "@modules/event"

@Injectable()
export class PythSuiService implements IOracleService, OnModuleInit {
    private connection: SuiPriceServiceConnection
    private tokens: Array<TokenLike> = []
    private cacheManager: Cache

    constructor(
    private readonly cacheHelpersService: CacheHelpersService,
    @InjectWinston()
    private readonly logger: Logger,
    private readonly eventEmitterService: EventEmitterService,
    ) {
        this.connection = new SuiPriceServiceConnection(
            envConfig().pyth.sui.endpoint,
        )
    }
    onModuleInit() {
        this.cacheManager = this.cacheHelpersService.getCacheManager({
            autoSelect: true,
        })
    }

    initialize(tokens: Array<TokenLike>): void {
        this.tokens = tokens
        for (const network of Object.values(Network)) {
            this.subscribeToNetworkFeeds(network)
        }
    }

    subscribeToNetworkFeeds(network: Network) {
        const suiTokens = this.tokens.filter(
            (token) => token.chainId === ChainId.Sui 
            && token.network === network 
            && !!token.pythFeedId,
        )
        const feedIds = suiTokens.map((token) => token.pythFeedId!) 
        const callback = async (feed: PriceFeed) => {
            try {
                const priceUnchecked = feed.getPriceUnchecked()
                if (priceUnchecked) {
                    const token = suiTokens.find((token) => token.pythFeedId?.includes(feed.id))
                    if (!token) {
                        throw new Error(`Feed ${feed.id} not found`)
                    }
                    const price = computeDenomination(
                        new BN(priceUnchecked.price),
                        priceUnchecked.expo,
                    ).toNumber()
                    await this.cacheManager.set(
                        createCacheKey(
                            CacheKey.PythTokenPrice, 
                            token.displayId, 
                            network
                        ),
                        price,
                    )
                    this.eventEmitterService
                        .emit<PythSuiPricesUpdatedEvent>(
                            EventName.PythSuiPricesUpdated, 
                            {
                                network,
                                tokenId: token.displayId,
                                price,
                                chainId: token.chainId,
                            })
                    this.logger.debug(
                        WinstonLog.PythSuiPricesUpdated, [
                            {
                                network,
                                tokenId: token.displayId,
                                price,
                                chainId: token.chainId,
                            },
                        ])
                }
            } catch (error) { 
                //
                this.logger.error(
                    WinstonLog.PythPriceUpdatedError, {
                        network,
                        feedId: feed.id,
                        message: error.message,
                        stack: error.stack,
                    })
            }
        }
        this.connection.subscribePriceFeedUpdates(
            feedIds, 
            callback,
        )
    }

    async getPrices(
        tokenIds: Array<TokenId>,
    ): Promise<Partial<Record<TokenId, Decimal>>> {
        const keys = tokenIds.map((tokenId) => {
            const token = this.tokens.find((token) => token.displayId === tokenId)
            if (!token) {
                throw new Error(`Token ${tokenId} not found`)
            }
            const network = token.network
            return createCacheKey(CacheKey.PythTokenPrice, tokenId, network)
        })
        const values = await this.cacheHelpersService.mget<number>({
            keys,
            autoSelect: true,
        })
        const prices: Partial<Record<TokenId, Decimal>> = {}
        tokenIds.forEach((tokenId, index) => {
            if (values[index] != null) {
                prices[tokenId] = new Decimal(values[index])
            }
        })
        return prices
    }

    async fetchPrices(
        network: Network,
    ): Promise<Partial<Record<TokenId, Decimal>>> {
        const tokenIds = this.tokens.map((token) => token.displayId)
        const suiTokens = this.tokens.filter(
            (token) =>
                tokenIds.includes(token.displayId) &&
                token.chainId === ChainId.Sui &&
                token.network === network &&
                !!token.pythFeedId,
        )
        const feedIds = suiTokens.map((token) => token.pythFeedId!)
        const feeds = (await this.connection.getLatestPriceFeeds(feedIds)) || []
        const result: Partial<Record<TokenId, Decimal>> = {}
        const entries: Array<[TokenId, number]> = []
        for (const feed of feeds) {
            const token = suiTokens.find((token) => token.pythFeedId === `0x${feed.id}`)
            if (!token) continue
            const priceUnchecked = feed.getPriceUnchecked()
            if (!priceUnchecked) continue
            const price = new Decimal(
                computeDenomination(new BN(priceUnchecked.price), priceUnchecked.expo),
            )
            result[token.displayId] = price
            entries.push([token.displayId, price.toNumber()])
        }
        await this.cacheHelpersService.mset<number>({
            entries: entries.map(([tokenId, value]) => ({
                key: createCacheKey(
                    CacheKey.PythTokenPrice, 
                    tokenId, 
                    network
                ),
                value,
            })),
            autoSelect: true,
        })
        this.logger.debug(
            WinstonLog.PythSuiPricesUpdated,
            entries.map(([tokenId, value]) => ({
                network,
                tokenId,
                price: value,
            })),
        )
        return result
    }

    async preloadPrices(): Promise<void> {
        const promises: Array<Promise<void>> = []
        for (const network of Object.values(Network)) {
            promises.push(
                (async () => {
                    await this.fetchPrices(network)
                })(),
            )
        }
        await Promise.all(promises)
    }
}
