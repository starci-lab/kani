import { Connection } from "@solana/web3.js"
import { getPythProgramKeyForCluster, PythConnection } from "@pythnetwork/client"
import { IOracleService } from "./i-oracle.interface"
import { TokenId, TokenLike } from "@modules/databases"
import Decimal from "decimal.js"
import { Injectable } from "@nestjs/common"
import { InjectSolanaClients } from "../clients"
import { ChainId } from "@modules/common"

@Injectable()
export class PythSolanaService implements IOracleService {
    private connection: PythConnection
    private fetchedPrices: Map<TokenId, Decimal> = new Map()

    constructor(
        @InjectSolanaClients()
        private readonly solanaClients: Record<ChainId, Array<Connection>>,
    ) {
        const solanaConn = this.solanaClients[ChainId.Solana][0]
        const programKey = getPythProgramKeyForCluster("mainnet-beta")
        this.connection = new PythConnection(solanaConn, programKey)
    }

    /**
   * Start subscriptions for tokens you want to track.
   * Keeps updating `fetchedPrices` whenever new data arrives.
   */
    subscribe(tokens: Array<TokenLike>): void {
        tokens.forEach(token => {
            this.connection.onPriceChange((product) => {
                if (!product || product.price === undefined) return
                let price = new Decimal(product.price)
                if (token.decimals && token.decimals > 0) {
                    price = price.div(new Decimal(10).pow(token.decimals))
                }
                this.fetchedPrices.set(token.displayId, price)
            })
        })
    }

    /**
   * Read the latest cached prices from `fetchedPrices`.
   */
    async fetchPrices(
        tokenIds: Array<TokenId>,
        tokens: Array<TokenLike>
    ): Promise<Partial<Record<TokenId, Decimal>>> {
        const fetchTokens = tokens.filter(t => tokenIds.includes(t.displayId))
        if (fetchTokens.length !== tokenIds.length) {
            throw new Error("Some tokens not found")
        }
        const result: Partial<Record<TokenId, Decimal>> = {}
        fetchTokens.forEach(token => {
            const cachedPrice = this.fetchedPrices.get(token.displayId)
            if (!cachedPrice) {
                throw new Error(`No cached price yet for ${token.displayId}. Did you call subscribeTokens()?`)
            }
            result[token.displayId] = cachedPrice
        })
        return result
    }
}