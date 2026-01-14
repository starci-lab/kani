import { TokenListIsEmptyException } from "@exceptions"
import { Injectable } from "@nestjs/common"
import { MarketId, PrimaryMemoryStorageService } from "@modules/databases"
import { PythTokenPrice, PythTokenPriceData } from "./types"

@Injectable()
export class PythUtilsService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Get the Pyth ids for the tokens
     * @returns The Pyth ids without duplicates
     */
    getPythIds() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => !!token.marketListings.find(market => market.id === MarketId.Pyth)
            )
        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Pyth tokens found for mainnet")
        }
        return [...new Set(
            tokens.map(
                token => token.marketListings.find(market => market.id === MarketId.Pyth)?.symbol
            )
        )
        ].filter(Boolean) as Array<string>
    }

    /**
     * Get the Pyth token prices for the tokens
     * @param tokenIds The token ids
     * @returns The Pyth token prices
     */
    getPythTokenPrices(tokenPriceData: Array<PythTokenPriceData>): Array<PythTokenPrice> {
        // retrieve the tokens from the primary memory storage service
        const tokens = this.primaryMemoryStorageService.tokens
        // filter out the tokens that do not have a Pyth market listing
        const tokensWithPythMarketListing = tokens.filter(token => token.marketListings.some(market => market.id === MarketId.Pyth))
        // map the token prices to the Pyth token prices
        return tokenPriceData.map(
            tokenPriceData => {
                const token = tokensWithPythMarketListing.find(token => token.marketListings.some(market => market.id === MarketId.Pyth && market.symbol === tokenPriceData.feedId))
                if (!token) return undefined
                return {
                    tokenId: token.displayId,
                    price: tokenPriceData.price,
                }
            }
        ).filter(Boolean) as Array<PythTokenPrice>
    }
}

