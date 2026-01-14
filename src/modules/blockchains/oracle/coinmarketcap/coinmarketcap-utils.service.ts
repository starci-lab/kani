import { TokenListIsEmptyException } from "@exceptions"
import { Injectable } from "@nestjs/common"
import { MarketId, PrimaryMemoryStorageService } from "@modules/databases"
import { CoinMarketCapTokenPrice, CoinMarketCapTokenPriceData } from "./types"

@Injectable()
export class CoinMarketCapUtilsService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Get the CoinMarketCap symbols for the tokens
     * @returns The CoinMarketCap symbols without duplicates
     */
    getCoinMarketCapSymbols() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => !!token.marketListings.find(market => market.id === MarketId.CoinMarketCap)
            )
        if (!tokens.length) {
            throw new TokenListIsEmptyException("No CoinMarketCap tokens found for mainnet")
        }
        return [...new Set(
            tokens.map(
                token => token.marketListings.find(market => market.id === MarketId.CoinMarketCap)?.symbol
            )
        )
        ].filter(Boolean) as Array<string>
    }

    /**
     * Get the CoinMarketCap token prices for the tokens
     * @param tokenPriceData The token price data from CoinMarketCap API
     * @returns The CoinMarketCap token prices
     */
    getCoinMarketCapTokenPrices(tokenPriceData: Array<CoinMarketCapTokenPriceData>): Array<CoinMarketCapTokenPrice> {
        // retrieve the tokens from the primary memory storage service
        const tokens = this.primaryMemoryStorageService.tokens
        // map the token prices to the CoinMarketCap token prices
        return tokens.map(
            token => {
                const tokenPrice = tokenPriceData.find(
                    tokenPriceData => tokenPriceData.symbol === token.marketListings
                        .find(market => market.id === MarketId.CoinMarketCap)?.symbol
                )
                if (!tokenPrice) return undefined
                return {
                    tokenId: token.displayId,
                    price: tokenPrice.price ?? 0,
                }
            }
        ).filter(Boolean) as Array<CoinMarketCapTokenPrice>
    }
}
