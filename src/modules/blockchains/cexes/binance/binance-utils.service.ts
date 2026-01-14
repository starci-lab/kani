import { Injectable } from "@nestjs/common"
import { MarketId, PrimaryMemoryStorageService } from "@modules/databases"
import { BinanceTokenPrice, BinanceTokenPriceData } from "./types"

@Injectable()
export class BinanceUtilsService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Get the Binance symbols for the tokens
     * @returns The Binance symbols without duplicates
     */
    getBinanceSymbols() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => !!token.marketListings.find(market => market.id === MarketId.Binance)
            )
        if (!tokens.length) {
            return
        }
        return (
            [...new Set(
                tokens.map(
                    token => token.marketListings.find(market => market.id === MarketId.Binance)?.symbol
                )
            )
            ].filter(Boolean) as Array<string>
        ).map(symbol => `${symbol}@ticker`)
    }

    /**
     * Get the Binance token prices for the tokens
     * @param tokenPriceData The token price data from Binance API
     * @returns The Binance token prices
     */
    getBinanceTokenPrices(tokenPriceData: Array<BinanceTokenPriceData>): Array<BinanceTokenPrice> {
        // retrieve the tokens from the primary memory storage service
        const tokens = this.primaryMemoryStorageService.tokens
        // map the token prices to the Binance token prices
        return tokens.map(
            token => {
                const tokenPrice = tokenPriceData.find(
                    tokenPriceData => tokenPriceData.symbol === token.marketListings.find(market => market.id === MarketId.Binance)?.symbol)
                if (!tokenPrice) return undefined
                return {
                    tokenId: token.displayId,
                    price: tokenPrice.price,
                }
            }
        ).filter(Boolean) as Array<BinanceTokenPrice>
    }
}
