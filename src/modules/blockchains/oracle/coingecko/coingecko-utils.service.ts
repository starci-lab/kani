import { TokenListIsEmptyException } from "@exceptions"
import { Injectable } from "@nestjs/common"
import { MarketId, PrimaryMemoryStorageService } from "@modules/databases"
import { CoingeckoTokenPrice, CoingeckoTokenPriceData } from "./types"

@Injectable()
export class CoingeckoUtilsService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Get the Coingecko ids for the tokens
     * @returns The Coingecko ids without duplicates
     */
    getCoingeckoIds() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => !!token.marketListings.find(market => market.id === MarketId.Coingecko)
            )
        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Coingecko tokens found for mainnet")
        }
        return [...new Set(
            tokens.map(
                token => token.marketListings.find(market => market.id === MarketId.Coingecko)?.symbol
            )
        )
        ].filter(Boolean) as Array<string>
    }

    /**
     * Get the Coingecko token prices for the tokens
     * @param tokenPriceData The token price data from Coingecko API
     * @returns The Coingecko token prices
     */
    getCoingeckoTokenPrices(tokenPriceData: Array<CoingeckoTokenPriceData>): Array<CoingeckoTokenPrice> {
        // retrieve the tokens from the primary memory storage service
        const tokens = this.primaryMemoryStorageService.tokens
        // map the token prices to the Coingecko token prices
        return tokens.map(
            token => {
                const tokenPrice = tokenPriceData.find(
                    tokenPriceData => tokenPriceData.coinId === token.marketListings
                        .find(market => market.id === MarketId.Coingecko)?.symbol
                )
                if (!tokenPrice) return undefined
                return {
                    tokenId: token.displayId,
                    price: tokenPrice.price,
                }
            }
        ).filter(Boolean) as Array<CoingeckoTokenPrice>
    }
}
