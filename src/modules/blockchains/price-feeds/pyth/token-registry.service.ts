import {
    MarketListingId, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    PythTokenPriceData, PythTokenPrice 
} from "./types"

@Injectable()
export class PythTokenRegistryService {
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
   * Get all tokens that have a Pyth market listing
   */
    getSymbols(): Array<string> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Pyth
                }
            }
        })
        if (!tokens.length) return []
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
   * Map Pyth price feeds to internal token prices
   */
    resolvePythTokenPrices(
        tokenPriceData: Array<PythTokenPriceData>
    ): Array<PythTokenPrice> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Pyth
                }
            }
        }
        )
        return tokens.map(token => {
            const priceFeed = tokenPriceData.find(
                feed => token.marketListings.some(
                    marketListing => marketListing.symbol.includes(feed.feedId)
                )
            )
            if (!priceFeed) return undefined
            return {
                tokenId: token.displayId,
                id: token.id,
                price: priceFeed.price,
            }
        })
            .filter(Boolean) as Array<PythTokenPrice>
    }
}