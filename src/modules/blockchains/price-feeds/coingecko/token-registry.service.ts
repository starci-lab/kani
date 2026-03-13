import {
    Injectable, OnModuleInit
} from "@nestjs/common"
import {
    MarketListingId, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    CoingeckoTokenPrice, CoingeckoTokenPriceData 
} from "./types"
import {
    ReadinessWatcherFactoryService 
} from "@modules/mixin"
import {
    TokenSchema 
} from "@modules/databases"

/**
 * Service for managing Coingecko token registry and price resolution.
 * Maps Coingecko coin IDs to internal token identifiers.
 *
 * @example
 * const service = new CoingeckoTokenRegistryService(...)
 * const symbols = service.getSymbols()
 * const prices = service.resolveCoingeckoTokenPrices(priceData)
 */
@Injectable()
export class CoingeckoTokenRegistryService implements OnModuleInit {
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
                (marketListing) => marketListing.id === MarketListingId.Coingecko),
        ).map((token) => [token.id,
            token])
        )
    }
    /**
     * Gets all Coingecko coin IDs for tokens with Coingecko market listings.
     *
     * Note: for Coingecko, `marketListings[].symbol` stores the Coingecko coin id
     * (e.g. `"usd-coin"`).
     *
     * @returns Array of unique Coingecko coin IDs
     *
     * @example
     * const symbols = service.getSymbols()
     */
    getSymbols(): Array<string> {
        // Find all tokens with Coingecko market listings
        const tokens = Array.from(this.tokenMap.values())
        if (!tokens.length) return []
        // Extract unique symbols (coin IDs) from market listings
        return [
            ...new Set(
                tokens
                    .map(token => token.marketListings.find(
                        marketListing => marketListing.id === MarketListingId.Coingecko
                    )?.symbol ?? "")
                    .filter(symbol => symbol !== undefined)
            )
        ]
    }

    /**
     * Maps Coingecko price data to internal token prices.
     *
     * @param tokenPriceData - Array of Coingecko price data
     * @returns Array of resolved token prices
     *
     * @example
     * const prices = service.resolveCoingeckoTokenPrices([{ coinId: "usd-coin", price: 1.0 }])
     */
    resolveCoingeckoTokenPrices(
        tokenPriceData: Array<CoingeckoTokenPriceData>
    ): Array<CoingeckoTokenPrice> {
        // Find all tokens with Coingecko market listings
        const tokens = Array.from(this.tokenMap.values())
        if (!tokens.length) return []
        // Map tokens to prices by matching coin IDs
        return tokens
            .map(token => {
                // Find Coingecko market listing for this token
                const coingeckoListing = token.marketListings.find(
                    marketListing => marketListing.id === MarketListingId.Coingecko
                )
                if (!coingeckoListing?.symbol) return undefined
                // Find matching price data
                const priceData = tokenPriceData.find(
                    data => data.coinId === coingeckoListing.symbol
                )
                if (!priceData) return undefined
                // Return resolved token price
                return {
                    tokenId: token.displayId,
                    id: token.id,
                    price: priceData.price,
                }
            })
            .filter(token => token !== undefined)
    }
}