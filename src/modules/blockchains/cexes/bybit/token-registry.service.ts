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
    BybitTokenVolume,
    GetBybitTokenIdBySymbolParams,
    ResolveBybitTokenPricesParams,
    ResolveBybitTokenVolumesParams,
} from "./types"

/**
 * Service responsible for managing Bybit token registry and symbol mappings.
 * Provides functionality to retrieve Bybit symbols and map token prices.
 *
 * @example
 * const service = new BybitTokenRegistryService(...)
 * const priceSymbols = service.getPriceSymbols(); const volumeSymbols = service.getVolumeSymbols()
 * const prices = service.getTokenPrices({ tokenPriceDataArray: bybitData })
 */
@Injectable()
export class BybitTokenRegistryService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Gets Bybit symbols for ticker (price) stream.
     *
     * @returns Array of trading symbols (e.g. "BTCUSDT")
     */
    getPriceSymbols(): Array<string> {
        return this.getSymbols()
    }

    /**
     * Gets Bybit symbols for trade (volume) stream.
     *
     * @returns Array of trading symbols (e.g. "BTCUSDT")
     */
    getVolumeSymbols(): Array<string> {
        return this.getSymbols()
    }

    private getSymbols(): Array<string> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Bybit,
                },
            },
        })
        if (!tokens.length) return []
        return [
            ...new Set(
                tokens
                    .map((token) =>
                        token.marketListings.find(
                            (marketListing) =>
                                marketListing.id === MarketListingId.Bybit,
                        )?.symbol ?? "",
                    )
                    .filter(Boolean),
            ),
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
     * const prices = service.getTokenPrices({ tokenPriceDataArray: bybitData })
     */
    getTokenPrices({ tokenPriceDataArray }: ResolveBybitTokenPricesParams): Array<BybitTokenPrice> {
        // find all tokens with Bybit market listings
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Bybit,
                },
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
     * Maps Bybit token volume data to internal token volume structure.
     *
     * @param param - Parameters for resolving token volumes
     * @param param.tokenVolumeDataArray - Array of symbol + volume from Bybit API
     * @returns Array of token volumes with token identification
     *
     * @example
     * const volumes = service.getTokenVolumes({ tokenVolumeDataArray: [{ symbol: "BTCUSDT", volume: 100 }] })
     */
    getTokenVolumes({ tokenVolumeDataArray }: ResolveBybitTokenVolumesParams): Array<BybitTokenVolume> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Bybit,
                },
            },
        })
        if (!tokens.length) return []
        return tokens.map(token => {
            const listingSymbol = token.marketListings.find(
                marketListing => marketListing.id === MarketListingId.Bybit,
            )?.symbol
            if (!listingSymbol) return undefined
            const tokenVolume = tokenVolumeDataArray.find(d => d.symbol === listingSymbol)
            if (!tokenVolume) return undefined
            return {
                tokenId: token.displayId,
                id: token.id,
                volume: tokenVolume.volume,
            }
        }).filter(Boolean) as Array<BybitTokenVolume>
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


