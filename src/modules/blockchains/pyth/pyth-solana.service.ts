import { Connection, PublicKey } from "@solana/web3.js"
import { getPythProgramKeyForCluster, parsePriceData, PythConnection } from "@pythnetwork/client"
import { IOracleService } from "./i-oracle.interface"
import { TokenId, TokenLike } from "@modules/databases"
import Decimal from "decimal.js"
import { Injectable } from "@nestjs/common"
import { InjectSolanaClients } from "../clients"
import { Network } from "@modules/common"
import { Cache } from "cache-manager"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"

@Injectable()
export class PythSolanaService implements IOracleService {
    private connections: Partial<Record<Network, PythConnection>> = {}
    private tokens: Array<TokenLike> = []
    private readonly cacheManager: Cache

    constructor(
    @InjectSolanaClients()
    private readonly solanaClients: Record<Network, Array<Connection>>,
    private readonly cacheHelpersService: CacheHelpersService,
    ) {
        Object.values(Network).forEach((network) => {
            this.connections[network] = new PythConnection(
                this.solanaClients[network][0],
                getPythProgramKeyForCluster(
                    network === Network.Mainnet ? "mainnet-beta" : "testnet",
                ),
            )
        })

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

    /**
   * Subscribe to price feeds for a specific network
   */
    private subscribeToNetworkFeeds(
        network: Network,
    ) {
        const connection = this.connections[network]
        if (!connection) return
        const solTokens = this.tokens.filter(
            (token) => token.network === network && token.pythFeedId,
        )
        solTokens.forEach((token) => {
            connection.onPriceChange(async (priceData) => {
                if (!priceData || priceData.price === undefined) return
                let price = new Decimal(priceData.price)
                if (token.decimals && token.decimals > 0) {
                    price = price.div(new Decimal(10).pow(token.decimals))
                }

                await this.cacheManager.set(
                    createCacheKey(
                        CacheKey.PythTokenPrice, 
                        token.displayId,
                        network
                    ),
                    price.toNumber(),
                )
            })
        })
    }

    /**
   * Return latest cached prices
   */
    async getPrices(
        tokenIds: Array<TokenId>,
    ): Promise<Partial<Record<TokenId, Decimal>>> {
        const keys = tokenIds.map((id) =>
            createCacheKey(CacheKey.PythTokenPrice, id),
        )
        const values = await this.cacheManager.mget<number>(keys)

        const result: Partial<Record<TokenId, Decimal>> = {}
        tokenIds.forEach((tokenId, index) => {
            if (values[index] != null) {
                result[tokenId] = new Decimal(values[tokenId]!)
            }
        })
        return result
    }

    async fetchPrices(
        network: Network,
    ): Promise<Partial<Record<TokenId, Decimal>>> {
        const connection = this.solanaClients[network][0]
      
        // lọc ra token thuộc network và có feed id
        const tokens = this.tokens.filter(
            (token) => token.network === network && token.pythFeedId,
        )
        if (tokens.length === 0) return {}
      
        // gom public keys
        const publicKeys = tokens.map((t) => new PublicKey(t.pythFeedId!))
      
        // fetch nhiều accounts 1 lần
        const accounts = await connection.getMultipleAccountsInfo(publicKeys)
      
        const result: Partial<Record<TokenId, Decimal>> = {}
      
        accounts.forEach((accountInfo, i) => {
            const token = tokens[i]
            if (!accountInfo || !token) return
      
            const priceData = parsePriceData(accountInfo.data)
            if (priceData?.price !== undefined) {
                let price = new Decimal(priceData.price)
                if (token.decimals && token.decimals > 0) {
                    price = price.div(new Decimal(10).pow(token.decimals))
                }
                result[token.displayId] = price
      
                // lưu vào cache
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