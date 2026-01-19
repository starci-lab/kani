import {
    Injectable,
} from "@nestjs/common"
import {
    MarketListingId,
    MarketListingSchema,
    PrimaryMemoryStorageService,
    TokenId,
} from "@modules/databases"
import {
    BybitTokenPrice,
    BybitTokenPriceData,
} from "./types"

@Injectable()
export class BybitTokenRegistryService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Get all tokens that have a Bybit market listing.
     *
     * Note: for Bybit, `marketListings[].symbol` stores the Bybit trading symbol
     * (e.g. `"BTCUSDT"`).
     */
    getSymbols(): Array<string> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find(
            {
                marketListings: {
                    $elemMatch: {
                        id: MarketListingId.Bybit,
                    },
                }
            }
        )
        if (!tokens.length) return []
        return [
            ...new Set(
                tokens
                    .map(token => token.marketListings.find(
                        marketListing => marketListing.id === MarketListingId.Bybit,
                    )?.symbol ?? "")
                    .filter(Boolean),
            )
        ].filter(Boolean) as Array<string>
    }

    /**
     * Map Bybit price updates (symbol -> price) into tokenId -> price.
     */
    resolveTokenPrices(
        tokenPriceDataArray: Array<BybitTokenPriceData>
    ): Array<BybitTokenPrice> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $where: (marketListing: MarketListingSchema) => marketListing.id === MarketListingId.Bybit,
            },
        })
        if (!tokens.length) return []
        return tokens.map(token => {
            const listingSymbol = token.marketListings.find(
                marketListing => marketListing.id === MarketListingId.Bybit,
            )?.symbol
            if (!listingSymbol) return undefined
            const tokenPrice = tokenPriceDataArray.find(tokenPriceData => tokenPriceData.symbol === listingSymbol)
            if (!tokenPrice) return undefined
            return {
                tokenId: token.displayId,
                price: tokenPrice.price,
            }
        }).filter(Boolean) as Array<BybitTokenPrice>
    }

    /**
     * Resolve a Bybit symbol to a tokenId (if present in memory).
     */
    getTokenIdBySymbol(symbol: string): TokenId | undefined {
        const token = this.primaryMemoryStorageService.tokenCollection.findOne({
            marketListings: {
                $where: (marketListing: MarketListingSchema) =>
                    marketListing.id === MarketListingId.Bybit && marketListing.symbol === symbol,
            },
        })
        return token?.displayId
    }
}


