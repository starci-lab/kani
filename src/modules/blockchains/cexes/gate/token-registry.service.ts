import {
    Injectable,
} from "@nestjs/common"
import {
    MarketListingId,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import type {
    GateTokenPrice,
    GateTokenVolume,
    ResolveGateTokenPricesParams,
    ResolveGateTokenVolumesParams,
} from "./types"

/**
 * Service responsible for managing Gate.io token registry and symbol mappings.
 * Provides functionality to retrieve Gate.io symbols and map token prices.
 *
 * @example
 * const service = new GateTokenRegistryService(...)
 * const symbols = service.getSymbols()
 * const prices = service.resolveTokenPrices({ tokenPriceDataArray: gateData })
 */
@Injectable()
export class GateTokenRegistryService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Gets Gate.io symbols for all tokens that have Gate.io market listings.
     *
     * Note: for Gate, `marketListings[].symbol` stores the Gate currency pair
     * (e.g. `"SOL_USDT"`).
     *
     * @returns Array of unique Gate.io trading symbols
     *
     * @example
     * const symbols = service.getSymbols()
     */
    getSymbols(): Array<string> {
        // find all tokens with Gate.io market listings
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Gate,
                },
            }
        })
        
        if (!tokens.length) return []
        
        // extract unique symbols
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
     * Maps Gate.io token price data to internal token price structure.
     *
     * @param param - Parameters for resolving token prices
     * @param param.tokenPriceDataArray - Array of token price data from Gate.io API
     * @returns Array of Gate.io token prices with token identification
     *
     * @example
     * const prices = service.resolveTokenPrices({ tokenPriceDataArray: gateData })
     */
    resolveTokenPrices({ tokenPriceDataArray }: ResolveGateTokenPricesParams): Array<GateTokenPrice> {
        // find all tokens with Gate.io market listings
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
        // map token prices to internal structure
        return tokens.map(
            token => {
            // find Gate.io listing symbol for this token
                const listingSymbol = token.marketListings.find(
                    marketListing => marketListing.id === MarketListingId.Gate,
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
            }
        ).filter(Boolean) as Array<GateTokenPrice>
    }

    /**
     * Maps Gate.io token volume data to internal token volume structure.
     *
     * @param param - Parameters for resolving token volumes
     * @param param.tokenVolumeDataArray - Array of symbol + volume from Gate.io API
     * @returns Array of token volumes with token identification
     *
     * @example
     * const volumes = service.resolveTokenVolumes({ tokenVolumeDataArray: [{ symbol: "SOL_USDT", volume: 100 }] })
     */
    resolveTokenVolumes({ tokenVolumeDataArray }: ResolveGateTokenVolumesParams): Array<GateTokenVolume> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Gate,
                },
            },
        })
        if (!tokens.length) return []
        return tokens.map(token => {
            const listingSymbol = token.marketListings.find(
                marketListing => marketListing.id === MarketListingId.Gate,
            )?.symbol
            if (!listingSymbol) return undefined
            const tokenVolume = tokenVolumeDataArray.find(d => d.symbol === listingSymbol)
            if (!tokenVolume) return undefined
            return {
                tokenId: token.displayId,
                id: token.id,
                volume: tokenVolume.volume,
            }
        }).filter(Boolean) as Array<GateTokenVolume>
    }
}


