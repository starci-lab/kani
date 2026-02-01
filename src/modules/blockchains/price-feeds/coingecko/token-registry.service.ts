import {
    Injectable 
} from "@nestjs/common"
import {
    MarketListingId, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    CoingeckoTokenPrice, CoingeckoTokenPriceData 
} from "./types"

@Injectable()
export class CoingeckoTokenRegistryService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Get all tokens that have a Coingecko market listing
     *
     * Note: for Coingecko, `marketListings[].symbol` stores the Coingecko coin id
     * (e.g. `"usd-coin"`).
     */
    getSymbols(): Array<string> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Coingecko,
                },
            }
        })
        if (!tokens.length) return []

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
     * Map Coingecko price data to internal token prices
     */
    resolveCoingeckoTokenPrices(
        tokenPriceData: Array<CoingeckoTokenPriceData>
    ): Array<CoingeckoTokenPrice> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Coingecko,
                },
            }
        })
        if (!tokens.length) return []
        return tokens
            .map(token => {
                const coingeckoListing = token.marketListings.find(
                    marketListing => marketListing.id === MarketListingId.Coingecko
                )
                if (!coingeckoListing?.symbol) return undefined
                const priceData = tokenPriceData.find(
                    data => data.coinId === coingeckoListing.symbol
                )
                if (!priceData) return undefined
                return {
                    tokenId: token.displayId,
                    id: token.id,
                    price: priceData.price,
                }
            })
            .filter(token => token !== undefined)
    }
}