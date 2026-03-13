import {
    Injectable 
} from "@nestjs/common"
import {
    MarketListingId, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    CoinMarketCapTokenPrice,
    CoinMarketCapTokenPriceData 
} from "./types"

/**
 * Service for managing CoinMarketCap token registry and price resolution.
 * Maps CoinMarketCap numeric IDs to internal token identifiers.
 *
 * @example
 * const service = new CoinMarketCapTokenRegistryService(...)
 * const symbols = service.getSymbols()
 * const prices = service.resolveCoinMarketCapTokenPrices(priceData)
 */
@Injectable()
export class CoinMarketCapTokenRegistryService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Gets all CoinMarketCap numeric IDs for tokens with CoinMarketCap market listings.
     *
     * Note: for CoinMarketCap, `marketListings[].symbol` stores the CoinMarketCap numeric id
     * (e.g. `"3408"`).
     *
     * @returns Array of unique CoinMarketCap numeric IDs
     *
     * @example
     * const symbols = service.getSymbols()
     */
    getSymbols(): Array<string> {
        // Find all tokens with CoinMarketCap market listings
        const tokens = Array.from(this.primaryMemoryStorageService.tokenMap.values()).filter(
            (t) => t.marketListings?.some((m) => m.id === MarketListingId.CoinMarketCap),
        )
        if (!tokens.length) return []
        // Extract unique symbols (numeric IDs) from market listings
        return [
            ...new Set(
                tokens.map(
                    token => token.marketListings.find(
                        marketListing => marketListing.id === MarketListingId.CoinMarketCap
                    )?.symbol ?? ""
                )
                    .filter(symbol => symbol !== undefined)
            )
        ]
    }

    /**
     * Maps CoinMarketCap price data to internal token prices.
     *
     * @param tokenPriceData - Array of CoinMarketCap price data
     * @returns Array of resolved token prices
     *
     * @example
     * const prices = service.resolveCoinMarketCapTokenPrices([{ symbol: "3408", price: 1.5 }])
     */
    resolveCoinMarketCapTokenPrices(
        tokenPriceData: Array<CoinMarketCapTokenPriceData>
    ): Array<CoinMarketCapTokenPrice> {
        // Find all tokens with CoinMarketCap market listings
        const tokens = Array.from(this.primaryMemoryStorageService.tokenMap.values()).filter(
            (t) => t.marketListings?.some((m) => m.id === MarketListingId.CoinMarketCap),
        )
        if (!tokens.length) return []
        // Map tokens to prices by matching symbols (numeric IDs)
        return tokens.map(
            token => {
                // Find matching price data for this token
                const tokenPrice = tokenPriceData.find(
                    tokenPriceData => tokenPriceData.symbol === token.marketListings
                        .find(
                            marketListing => marketListing.id === MarketListingId.CoinMarketCap
                        )?.symbol
                )
                if (!tokenPrice) return undefined
                // Return resolved token price
                return {
                    tokenId: token.displayId,
                    id: token.id,
                    price: tokenPrice.price ?? 0,
                }
            }
        ).filter(token => token !== undefined)
    }
}
