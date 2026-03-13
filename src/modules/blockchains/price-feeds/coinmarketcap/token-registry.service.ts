import {
    Injectable, OnModuleInit
} from "@nestjs/common"
import {
    MarketListingId, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    CoinMarketCapTokenPrice,
    CoinMarketCapTokenPriceData 
} from "./types"
import {
    TokenSchema 
} from "@modules/databases"
import {
    ReadinessWatcherFactoryService 
} from "@modules/mixin"

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
export class CoinMarketCapTokenRegistryService implements OnModuleInit {
    private tokenMap: Map<string, TokenSchema> = new Map()
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    async onModuleInit() {   
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        this.tokenMap = new Map(Array.from(this.primaryMemoryStorageService.tokenMap.values()).filter(
            (token) => token.marketListings?.some(
                (marketListing) => marketListing.id === MarketListingId.CoinMarketCap),
        ).map((token) => [token.id,
            token])
        )
    }

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
        const tokens = Array.from(this.tokenMap.values())
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
        const tokens = Array.from(this.tokenMap.values())
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
