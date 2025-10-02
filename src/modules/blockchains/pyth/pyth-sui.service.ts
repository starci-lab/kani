import { Injectable, OnModuleInit } from "@nestjs/common"
import { PriceFeed, SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js"
import Decimal from "decimal.js"
import BN from "bn.js"
import { Logger } from "winston"
import { IOracleService } from "./i-oracle.interface"
import { envConfig } from "@modules/env"
import { MemDbService, TokenId, TokenSchema } from "@modules/databases"
import { ChainId, computeDenomination, Network } from "@modules/common"
import { CacheKey, CacheManagerService, createCacheKey } from "@modules/cache"
import { EventEmitterService, EventName, PythSuiPricesUpdatedEvent } from "@modules/event"
import { AsyncService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"

@Injectable()
export class PythSuiService implements IOracleService, OnModuleInit {
    private connection: SuiPriceServiceConnection
    private tokens: TokenSchema[] = []

    constructor(
        private readonly cache: CacheManagerService,
        @InjectWinston() private readonly logger: Logger,
        private readonly memDb: MemDbService,
        private readonly events: EventEmitterService,
        private readonly asyncService: AsyncService,
    ) {
        this.connection = new SuiPriceServiceConnection(envConfig().pyth.sui.endpoint)
    }

    async onModuleInit() {
        await this.initialize()
    }

    /** 
     * Initialize Pyth oracle:
     * - Load tokens from MemDB
     * - Pre-fetch initial prices for all networks
     * - Subscribe to live feed updates
     */
    async initialize(): Promise<void> {
        this.tokens = this.memDb.tokens.filter(
            token => token.chainId === ChainId.Sui
        )
        // Fetch initial prices for all networks in parallel
        await this.asyncService.allIgnoreError(Object.values(Network).map(network => this.fetchPrices(network)))
        // Subscribe to price updates for each network
        for (const network of Object.values(Network)) {
            this.subscribeToPriceFeeds(network)
        }
        this.logger.info("[PythSui] Initialized price feeds", { networks: Object.values(Network) })
    }

    /**
     * Subscribe to live Pyth price feed updates for a specific network.
     */
    private subscribeToPriceFeeds(network: Network) {
        const suiTokens = this.tokens.filter(
            token => token.network === network && !!token.pythFeedId
        )
        const feedIds = suiTokens.map(t => t.pythFeedId!)

        if (feedIds.length === 0) return

        this.connection.subscribePriceFeedUpdates(feedIds, async (feed) => {
            try {
                await this.handlePriceUpdate(network, feed, suiTokens)
            } catch (error) {
                this.logger.error(WinstonLog.PythPriceUpdatedError, {
                    network,
                    feedId: feed.id,
                    message: error.message,
                    stack: error.stack,
                })
            }
        })

        this.logger.info(`[PythSui] Subscribed ${feedIds.length} feeds for network ${network}`)
    }

    /**
     * Handle individual price feed update → parse price, cache, and emit event.
     */
    private async handlePriceUpdate(network: Network, feed: PriceFeed, tokenList: TokenSchema[]) {
        const priceUnchecked = feed.getPriceUnchecked()
        if (!priceUnchecked) return

        const token = tokenList.find(t => t.pythFeedId?.includes(feed.id))
        if (!token) throw new Error(`No token found for feed ${feed.id}`)

        const price = computeDenomination(
            new BN(priceUnchecked.price),
            priceUnchecked.expo,
        ).toNumber()

        // Cache price
        await this.cache.set({
            key: createCacheKey(CacheKey.PythTokenPrice, token.displayId, network),
            value: price,
        })

        // Emit internal event
        this.events.emit<PythSuiPricesUpdatedEvent>(
            EventName.PythSuiPricesUpdated,
            {
                network,
                tokenId: token.displayId,
                price,
                chainId: token.chainId,
            },
        )

        this.logger.debug(
            WinstonLog.PythSuiPricesUpdated, {
                network,
                tokenId: token.displayId,
                price,
            })
    }

    /**
     * Fetch latest prices from Pyth for a given network and cache them.
     */
    async fetchPrices(network: Network): Promise<Partial<Record<TokenId, Decimal>>> {
        const networkTokens = this.tokens.filter(
            token => token.network === network && !!token.pythFeedId
        )
        if (networkTokens.length === 0) return {}

        const feedIds = networkTokens.map(t => t.pythFeedId!)
        const feeds = (await this.connection.getLatestPriceFeeds(feedIds)) || []

        const result: Partial<Record<TokenId, Decimal>> = {}
        const entries: Array<{ key: string; value: number }> = []

        for (const feed of feeds) {
            const token = networkTokens.find(t => t.pythFeedId === `0x${feed.id}`)
            if (!token) continue

            const priceUnchecked = feed.getPriceUnchecked()
            if (!priceUnchecked) continue

            const price = new Decimal(
                computeDenomination(new BN(priceUnchecked.price), priceUnchecked.expo),
            )

            result[token.displayId] = price
            entries.push({
                key: createCacheKey(CacheKey.PythTokenPrice, token.displayId, network),
                value: price.toNumber(),
            })
        }

        if (entries.length > 0) {
            await this.cache.mset({ entries })
            this.logger.debug(WinstonLog.PythSuiPricesUpdated, entries)
        }

        return result
    }

    /**
     * Get cached prices for a list of token IDs.
     */
    async getPrices(tokenIds: TokenId[]): Promise<Partial<Record<TokenId, Decimal>>> {
        const keys = tokenIds.map(tokenId => {
            const token = this.tokens.find(t => t.displayId === tokenId)
            if (!token) throw new Error(`Token ${tokenId} not found`)
            return createCacheKey(CacheKey.PythTokenPrice, tokenId, token.network)
        })

        const values = await this.cache.mget<number>(keys)
        const prices: Partial<Record<TokenId, Decimal>> = {}

        tokenIds.forEach((tokenId, i) => {
            const v = values[i]
            if (v != null) prices[tokenId] = new Decimal(v)
        })

        this.logger.debug(WinstonLog.PythSuiPricesUpdated, prices)
        return prices
    }

    /**
     * Preload prices for all networks (e.g. at app startup).
     */
    async preloadPrices(): Promise<void> {
        await Promise.all(Object.values(Network).map(network => this.fetchPrices(network)))
    }
}