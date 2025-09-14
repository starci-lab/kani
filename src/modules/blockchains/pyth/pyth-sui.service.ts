import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js"
import { IOracleService } from "./i-oracle.interface"
import { envConfig } from "@modules/env"
import { TokenId, TokenLike } from "@modules/databases"
import Decimal from "decimal.js"
import { ChainId, computeDenomination } from "@modules/common"
import BN from "bn.js"

export class PythSuiService implements IOracleService {
    private connection: SuiPriceServiceConnection
    private cachedPrices: Partial<Record<TokenId, Decimal>> = {}
    private tokens: Array<TokenLike> = []
    constructor() {
        this.connection = new SuiPriceServiceConnection(envConfig().pyth.sui.endpoint)
    }
  
    subscribe(
        tokenIds: Array<TokenId>, 
        tokens: Array<TokenLike>
    ) {
        this.tokens = tokens
        const usedTokens = tokens.filter(
            (token) => tokenIds.includes(token.displayId) && token.chainId === ChainId.Sui,
        )
        const feedIds = usedTokens.map((token) => token.pythFeedId)
        this.connection.subscribePriceFeedUpdates(feedIds, (feed) => {
            const priceUnchecked = feed.getPriceUnchecked()
            if (priceUnchecked) {
                const token = usedTokens.find((token) => token.pythFeedId === feed.id)
                if (token) {
                    this.cachedPrices[token.displayId] = new Decimal(
                        computeDenomination(new BN(priceUnchecked.price), priceUnchecked.expo),
                    )
                }
            }
        })
    }
  
    async fetchPrices(
        tokenIds: Array<TokenId>,
    ): Promise<Partial<Record<TokenId, Decimal>>> {
        const tokens = this.tokens.filter(
            (token) => tokenIds.includes(token.displayId) && token.chainId === ChainId.Sui,
        )
        const feedIds = tokens.map((token) => token.pythFeedId)
        await this.connection.getLatestPriceFeeds(feedIds)
        return this.cachedPrices
    }
}