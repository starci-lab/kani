import {
    Injectable,
} from "@nestjs/common"
import {
    MarketListingId,
    MarketListingSchema,
    PrimaryMemoryStorageService,
    TokenId,
} from "@modules/databases"
import type {
    BybitTokenPrice,
    GetBybitTokenIdBySymbolParams,
    ResolveBybitTokenPricesParams,
} from "./types"

/**
 * Service responsible for managing Bybit token registry and symbol mappings.
 * Provides functionality to retrieve Bybit symbols and map token prices.
 *
 * @example
 * const service = new BybitTokenRegistryService(...)
 * const symbols = service.getSymbols()
 * const prices = service.resolveTokenPrices(tokenPriceDataArray)
 */
@Injectable()
export class BybitTokenRegistryService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Gets Bybit symbols for all tokens that have Bybit market listings.
     *
     * Note: for Bybit, `marketListings[].symbol` stores the Bybit trading symbol
     * (e.g. `"BTCUSDT"`).
     *
     * @returns Array of unique Bybit trading symbols
     *
     * @example
     * const symbols = service.getSymbols()
     */
    getSymbols(): Array<string> {
        // find all tokens with Bybit market listings
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Bybit,
                },
            }
        })
        
        if (!tokens.length) return []
        
        // extract unique symbols
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
     * Maps Bybit token price data to internal token price structure.
     *
     * @param param - Parameters for resolving token prices
     * @param param.tokenPriceDataArray - Array of token price data from Bybit API
     * @returns Array of Bybit token prices with token identification
     *
     * @example
     * const prices = service.resolveTokenPrices({ tokenPriceDataArray: bybitData })
     */
    resolveTokenPrices({ tokenPriceDataArray }: ResolveBybitTokenPricesParams): Array<BybitTokenPrice> {
        // find all tokens with Bybit market listings
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $where: (marketListing: MarketListingSchema) => marketListing.id === MarketListingId.Bybit,
            },
        })
        
        if (!tokens.length) return []
        
        // map token prices to internal structure
        return tokens.map(token => {
            // find Bybit listing symbol for this token
            const listingSymbol = token.marketListings.find(
                marketListing => marketListing.id === MarketListingId.Bybit,
            )?.symbol
            if (!listingSymbol) return undefined
            
            // find matching price data
            const tokenPrice = tokenPriceDataArray.find(
                tokenPriceData => tokenPriceData.symbol === listingSymbol
            )
            if (!tokenPrice) return undefined
            
            // return mapped token price
            return {
                tokenId: token.displayId,
                id: token.id,
                price: tokenPrice.price,
            }
        }).filter(Boolean) as Array<BybitTokenPrice>
    }

    /**
     * Resolves a Bybit symbol to a token ID.
     *
     * @param param - Parameters for getting token ID
     * @param param.symbol - Bybit trading symbol
     * @returns Token ID if found, undefined otherwise
     *
     * @example
     * const tokenId = service.getTokenIdBySymbol({ symbol: "BTCUSDT" })
     */
    getTokenIdBySymbol({ symbol }: GetBybitTokenIdBySymbolParams): TokenId | undefined {
        // find token by Bybit symbol
        const token = this.primaryMemoryStorageService.tokenCollection.findOne({
            marketListings: {
                $where: (marketListing: MarketListingSchema) =>
                    marketListing.id === MarketListingId.Bybit && marketListing.symbol === symbol,
            },
        })
        
        return token?.displayId
    }
}


