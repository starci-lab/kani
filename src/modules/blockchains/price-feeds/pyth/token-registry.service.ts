import {
    MarketListingId, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    Injectable, OnModuleInit
} from "@nestjs/common"
import {
    PythTokenPriceData, PythTokenPrice 
} from "./types/token-price"
import {
    TokenSchema 
} from "@modules/databases"
import {
    ReadinessWatcherFactoryService 
} from "@modules/mixin"

/**
 * Service for managing Pyth token registry and price resolution.
 * Maps Pyth feed IDs to internal token identifiers.
 *
 * @example
 * const service = new PythTokenRegistryService(...)
 * const symbols = service.getSymbols()
 * const prices = service.resolvePythTokenPrices(priceData)
 */
@Injectable()
export class PythTokenRegistryService implements OnModuleInit {
    private tokenMap: Map<string, TokenSchema> = new Map()
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    /**
     * Initializes the token registry by fetching all tokens with Pyth market listings.
     */
    async onModuleInit() {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        this.tokenMap = new Map(Array.from(this.primaryMemoryStorageService.tokenMap.values()).filter(
            (token) => token.marketListings?.some(
                (marketListing) => marketListing.id === MarketListingId.Pyth),
        ).map((token) => [token.id,
            token])
        )
    }

    /**
     * Gets all Pyth feed symbols for tokens with Pyth market listings.
     *
     * @returns Array of unique Pyth feed symbols
     *
     * @example
     * const symbols = service.getSymbols()
     */
    getSymbols(): Array<string> {
        // Find all tokens with Pyth market listings
        const tokens = Array.from(this.primaryMemoryStorageService.tokenMap.values()).filter(
            (t) => t.marketListings?.some((m) => m.id === MarketListingId.Pyth),
        )
        if (!tokens.length) return []
        // Extract unique symbols from market listings
        return [
            ...new Set(
                tokens
                    .map(token => token.marketListings.find(
                        marketListing => marketListing.id === MarketListingId.Pyth
                    )?.symbol ?? "")
                    .filter(symbol => symbol !== undefined)
            )
        ]
    }

    /**
     * Maps Pyth price feed data to internal token prices.
     *
     * @param tokenPriceData - Array of Pyth price feed data
     * @returns Array of resolved token prices
     *
     * @example
     * const prices = service.resolvePythTokenPrices([{ feedId: "0x123", price: 1.5 }])
     */
    resolvePythTokenPrices(
        tokenPriceData: Array<PythTokenPriceData>
    ): Array<PythTokenPrice> {
        // Find all tokens with Pyth market listings
        const tokens = Array.from(this.primaryMemoryStorageService.tokenMap.values()).filter(
            (t) => t.marketListings?.some((m) => m.id === MarketListingId.Pyth),
        )
        // Map tokens to prices by matching feed IDs
        return tokens.map(
            token => {
            // Find matching price feed for this token
                const priceFeed = tokenPriceData.find(
                    feed => token.marketListings.some(
                        marketListing => marketListing.symbol.includes(feed.feedId)
                    )
                )
                if (!priceFeed) return undefined
                // Return resolved token price
                return {
                    tokenId: token.displayId,
                    id: token.id,
                    price: priceFeed.price,
                }
            }
        )
            .filter(Boolean) as Array<PythTokenPrice>
    }
}