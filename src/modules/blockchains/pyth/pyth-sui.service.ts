import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js"
import { IOracleService } from "./i-oracle.interface"
import { envConfig } from "@modules/env"
import { TokenId, TokenLike } from "@modules/databases"
import Decimal from "decimal.js"
import { ChainId, computeDenomination, Network } from "@modules/common"
import BN from "bn.js"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { Cache } from "cache-manager"
import { Injectable, OnModuleInit } from "@nestjs/common"

@Injectable()
export class PythSuiService implements IOracleService, OnModuleInit {
    private connection: SuiPriceServiceConnection
    private tokens: Array<TokenLike> = []
    private cacheManager: Cache
    
    constructor(
        private readonly cacheHelpersService: CacheHelpersService,
    ) {
        this.connection = new SuiPriceServiceConnection(envConfig().pyth.sui.endpoint)
        
    }
    onModuleInit() {
        this.cacheManager = this.cacheHelpersService.getCacheManager({
            autoSelect: true,
        })
    }

    initialize(
        tokens: Array<TokenLike>
    ): void {
        this.tokens = tokens
    }

    subscribe(): void { 
        for (const network of Object.values(Network)) {
            this.subscribeToNetworkFeeds(network)
        }
    }

    subscribeToNetworkFeeds(
        network: Network
    ) {
        const suiTokens = this.tokens.filter(
            (token) => token.chainId === ChainId.Sui
                && token.network === network
        )
        const feedIds = this.tokens.map((token) => token.pythFeedId)
        this.connection.subscribePriceFeedUpdates(
            feedIds, 
            async (feed) => {
                const priceUnchecked = feed.getPriceUnchecked()
                if (priceUnchecked) {
                    const token = suiTokens.find((token) => token.pythFeedId === feed.id)
                    if (!token) {
                        throw new Error(`Token ${feed.id} not found`)
                    }
                    await this.cacheManager.set(
                        createCacheKey(
                            CacheKey.PythTokenPrice,
                            token.displayId,
                            network
                        ), 
                        computeDenomination(
                            new BN(priceUnchecked.price), 
                            priceUnchecked.expo
                        ).toNumber()
                    )
                }
            })
    }

    async getPrices(
        tokenIds: Array<TokenId>,
    ): Promise<Partial<Record<TokenId, Decimal>>> {
        const keys = tokenIds.map((tokenId) =>
            createCacheKey(CacheKey.PythTokenPrice, tokenId),
        )
        const values = await this.cacheManager.mget<number>(keys)
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
        // Lọc tokens đúng chain và network
        const tokens = this.tokens.filter(
            (token) =>
                tokenIds.includes(token.displayId) &&
            token.chainId === ChainId.Sui &&
            token.network === network &&
            token.pythFeedId,
        )
        const feedIds = tokens.map((feed) => feed.pythFeedId!)
        const feeds = (await this.connection.getLatestPriceFeeds(feedIds)) || []
        const result: Partial<Record<TokenId, Decimal>> = {}
        feeds.forEach((feed) => {
            const token = tokens.find((token) => token.pythFeedId === feed.id)
            if (!token) return
            const priceUnchecked = feed.getPriceUnchecked()
            if (priceUnchecked) {
                const price = new Decimal(
                    computeDenomination(
                        new BN(priceUnchecked.price),
                        priceUnchecked.expo,
                    ),
                )
                result[token.displayId] = price
                this.cacheManager.set(
                    createCacheKey(CacheKey.PythTokenPrice, token.displayId, network),
                    price.toNumber(),
                )
            }
        })
        return result
    }

    async preloadPrices(
    ): Promise<void> {
        const promises: Array<Promise<void>> = []
        for (const network of Object.values(Network)) {
            promises.push((async () => {
                await this.fetchPrices(network)
            })())
        }
        await Promise.all(promises)
    }
}