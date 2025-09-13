import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js"
import { IOracleService } from "./i-oracle.interface"
import { envConfig } from "@modules/env"
import { TokenId, TokenLike } from "@modules/databases"
import Decimal from "decimal.js"
import { ChainId, computeDenomination } from "@modules/common"
import BN from "bn.js"

export class PythSuiService implements IOracleService {
    private connection: SuiPriceServiceConnection

    constructor() {
        console.log(envConfig().pyth.sui.endpoint)
        this.connection = new SuiPriceServiceConnection(
            envConfig().pyth.sui.endpoint, // e.g. https://hermes-beta.pyth.network
        )
    }

    async fetchPrices(
        tokenIds: Array<TokenId>,
        tokens: Array<TokenLike>,
    ): Promise<Partial<Record<TokenId, Decimal>>> {
    // Filter tokens to fetch only the requested ones
        const usedTokens = tokens.filter(
            (token) =>
                tokenIds.includes(token.displayId) && token.chainId === ChainId.Sui,
        )
        if (usedTokens.length !== tokenIds.length) {
            throw new Error("Some tokens not found")
        }
        // Collect Pyth feed IDs for these tokens
        const feedIds = usedTokens.map((token) => token.pythFeedId)
        // Fetch latest price feeds from Pyth
        const feeds = await this.connection.getLatestPriceFeeds(feedIds)
        if (!feeds || feeds.length === 0) {
            throw new Error("No price feeds returned")
        }
        // Map results back into { tokenId: Decimal(price) }
        const result: Partial<Record<TokenId, Decimal>> = {}

        feeds.forEach((feed, idx) => {
            const priceUnchecked = feed.getPriceUnchecked()
            const tokenId = usedTokens[idx].displayId
            if (!priceUnchecked) {
                throw new Error(`No price for feed ${feedIds[idx]}`)
            }
            result[tokenId] = new Decimal(
                computeDenomination(new BN(priceUnchecked.price), priceUnchecked.expo),
            ) // mantissa
        })
        return result
    }
}
