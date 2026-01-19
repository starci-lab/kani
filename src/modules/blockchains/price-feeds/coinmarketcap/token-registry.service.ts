import {
    Injectable 
} from "@nestjs/common"
import {
    MarketListingId, MarketListingSchema, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    CoinMarketCapTokenPrice, CoinMarketCapTokenPriceData 
} from "./types"

@Injectable()
export class CoinMarketCapTokenRegistryService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Get all tokens that have a CoinMarketCap market listing
     *
     * Note: for CoinMarketCap, `marketListings[].symbol` stores the CoinMarketCap numeric id
     * (e.g. `"3408"`).
     */
    getSymbols(): Array<string> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $where: (marketListing: MarketListingSchema) => marketListing.id === MarketListingId.CoinMarketCap
            }
        })
        if (!tokens.length) return []
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
     * Map CoinMarketCap price data to internal token prices
     */
    resolveCoinMarketCapTokenPrices(
        tokenPriceData: Array<CoinMarketCapTokenPriceData>
    ): Array<CoinMarketCapTokenPrice> {
        // retrieve the tokens from the primary memory storage service
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $where: (marketListing: MarketListingSchema) => marketListing.id === MarketListingId.CoinMarketCap
            }
        })
        if (!tokens.length) return []
        // map the token prices to the CoinMarketCap token prices
        return tokens.map(
            token => {
                const tokenPrice = tokenPriceData.find(
                    tokenPriceData => tokenPriceData.symbol === token.marketListings
                        .find(
                            marketListing => marketListing.id === MarketListingId.CoinMarketCap
                        )?.symbol
                )
                if (!tokenPrice) return undefined
                return {
                    tokenId: token.displayId,
                    price: tokenPrice.price ?? 0,
                }
            }
        ).filter(token => token !== undefined)
    }
}
