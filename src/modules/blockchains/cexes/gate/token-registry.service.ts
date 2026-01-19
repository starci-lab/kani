import {
    Injectable,
} from "@nestjs/common"
import {
    MarketListingId,
    MarketListingSchema,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    GateTokenPrice,
    GateTokenPriceData,
} from "./types"

@Injectable()
export class GateTokenRegistryService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Get all tokens that have a Gate market listing.
     *
     * Note: for Gate, `marketListings[].symbol` stores the Gate currency pair
     * (e.g. `"SOL_USDT"`).
     */
    getSymbols(): Array<string> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find(
            {
                marketListings: {
                    $elemMatch: {
                        id: MarketListingId.Gate,
                    },
                }
            }
        )
        if (!tokens.length) return []
        return [
            ...new Set(
                tokens
                    .map(token => token.marketListings.find(
                        marketListing => marketListing.id === MarketListingId.Gate,
                    )?.symbol ?? "")
                    .filter(Boolean),
            )
        ].filter(Boolean) as Array<string>
    }

    /**
     * Map Gate price updates (symbol -> price) into tokenId -> price.
     */
    resolveTokenPrices(tokenPriceDataArray: Array<GateTokenPriceData>): Array<GateTokenPrice> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $where: (marketListing: MarketListingSchema) => marketListing.id === MarketListingId.Gate,
            },
        })
        if (!tokens.length) return []
        return tokens.map(token => {
            const listingSymbol = token.marketListings.find(
                marketListing => marketListing.id === MarketListingId.Gate,
            )?.symbol
            if (!listingSymbol) return undefined
            const tokenPrice = tokenPriceDataArray.find(
                tokenPriceData => tokenPriceData.symbol === listingSymbol
            )
            if (!tokenPrice) return undefined
            return {
                tokenId: token.displayId,
                price: tokenPrice.price,
            }
        }).filter(Boolean) as Array<GateTokenPrice>
    }
}


