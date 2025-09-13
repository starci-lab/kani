import { Connection } from "@solana/web3.js"
import { getPythProgramKeyForCluster, PythConnection } from "@pythnetwork/client"
import { IOracleService } from "./i-oracle.interface"
import { TokenId, TokenLike } from "@modules/databases"
import Decimal from "decimal.js"
import { Injectable } from "@nestjs/common"
import { InjectSolanaClients } from "../clients"
import { Network } from "@modules/common"

@Injectable()
export class PythSolanaService implements IOracleService {
    private connections: Partial<Record<Network, PythConnection>> = {}
    private fetchedPrices: Map<TokenId, Decimal> = new Map()
    private tokens: Array<TokenLike> = []
    constructor(
    @InjectSolanaClients()
    private readonly solanaClients: Record<Network, Array<Connection>>,
    ) {
        Object.values(Network).forEach((network) => {
            this.connections[network] = new PythConnection(
                this.solanaClients[network][0],
                getPythProgramKeyForCluster(
                    network === Network.Mainnet ? "mainnet-beta" : "testnet",
                ),
            )
        })
    }

    /**
   * Start subscriptions for tokens you want to track.
   * Keeps updating `fetchedPrices` whenever new data arrives.
   */
    subscribe(tokens: Array<TokenLike>, network: Network = Network.Mainnet): void {
        this.tokens = tokens
        const connection = this.connections[network]
        if (!connection) {
            throw new Error(`No Pyth connection for network ${network}`)
        }

        tokens.forEach((token) => {
            if (!token.pythFeedId) return
            connection.onPriceChange((priceAccount) => {
                if (!priceAccount || priceAccount.price === undefined) return

                let price = new Decimal(priceAccount.price)
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
    ): Promise<Partial<Record<TokenId, Decimal>>> {
        const fetchTokens = this.tokens.filter((t) => tokenIds.includes(t.displayId))
        if (fetchTokens.length !== tokenIds.length) {
            throw new Error("Some tokens not found")
        }

        const result: Partial<Record<TokenId, Decimal>> = {}
        fetchTokens.forEach((token) => {
            const cachedPrice = this.fetchedPrices.get(token.displayId)
            if (cachedPrice) {
                result[token.displayId] = cachedPrice
            }
        })

        return result
    }
}