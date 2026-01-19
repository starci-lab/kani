import {
    Injectable 
} from "@nestjs/common"
import {
    MarketListingId, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    BinanceTokenPrice, BinanceTokenPriceData 
} from "./types"

@Injectable()
export class BinanceTokenRegistryService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Get the Binance symbols for the tokens
     * @returns The Binance symbols without duplicates
     */
    getBinanceSymbols() {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find(
            {
                marketListings: {
                    $elemMatch: {
                        id: MarketListingId.Binance,
                    },
                }
            }
        )
        if (!tokens.length) {
            return []
        }
        return (
            [...new Set(
                tokens.map(
                    token => token.marketListings.find(market => market.id === MarketListingId.Binance)?.symbol
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
    getBinanceTokenPrices(tokenPriceDataArray: Array<BinanceTokenPriceData>): Array<BinanceTokenPrice> {
        // retrieve the tokens from the primary memory storage service
        const tokens = this.primaryMemoryStorageService.tokenCollection.find(
            {
                marketListings: {
                    $elemMatch: {
                        id: MarketListingId.Binance,
                    },
                }
            }
        )
        if (!tokens.length) {
            return []
        }
        // map the token prices to the Binance token prices
        return tokens.map(
            token => {
                const listingSymbol = token.marketListings.find(
                    market => market.id === MarketListingId.Binance
                )?.symbol
                if (!listingSymbol) return undefined
                const tokenPrice = tokenPriceDataArray.find(
                    tokenPriceData => tokenPriceData.symbol === listingSymbol)
                if (!tokenPrice) return undefined
                return {
                    tokenId: token.displayId,
                    price: tokenPrice.price,
                }
            }
        ).filter(Boolean) as Array<BinanceTokenPrice>
    }
}
