import {
    Injectable 
} from "@nestjs/common"
import {
    MarketListingId, PrimaryMemoryStorageService 
} from "@modules/databases"
import type {
    BinanceTokenPrice,
    BinanceTokenVolume,
    GetBinanceTokenPricesParams,
    GetBinanceTokenVolumesParams,
} from "./types"

/**
 * Service responsible for managing Binance token registry and symbol mappings.
 * Provides functionality to retrieve Binance symbols and map token prices.
 *
 * @example
 * const service = new BinanceTokenRegistryService(...)
 * const symbols = service.getBinanceSymbols()
 * const prices = service.getBinanceTokenPrices({ tokenPriceDataArray: binanceData })
 */
@Injectable()
export class BinanceTokenRegistryService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Gets Binance symbols for all tokens that have Binance market listings.
     *
     * @returns Array of unique Binance symbols formatted for ticker stream (e.g., "SUIUSDT@ticker")
     *
     * @example
     * const symbols = service.getBinanceSymbols()
     */
    getBinanceSymbols(): Array<string> {
        // find all tokens with Binance market listings
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Binance,
                },
            }
        })
        
        if (!tokens.length) {
            return []
        }
        
        // extract unique symbols and format for ticker stream
        return (
            [...new Set(
                tokens.map(
                    token => token.marketListings.find(market => market.id === MarketListingId.Binance)?.symbol
                )
            )
            ].filter(Boolean) as Array<string>
        ).map(symbol => `${symbol}@ticker`)
    }

    /**
     * Maps Binance token price data to internal token price structure.
     *
     * @param param - Parameters for getting token prices
     * @param param.tokenPriceDataArray - Array of token price data from Binance API
     * @returns Array of Binance token prices with token identification
     *
     * @example
     * const prices = service.getBinanceTokenPrices({ tokenPriceDataArray: binanceData })
     */
    getBinanceTokenPrices({
        tokenPriceDataArray,
    }: GetBinanceTokenPricesParams): Array<BinanceTokenPrice> {
        // find all tokens with Binance market listings
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Binance,
                },
            }
        })
        
        if (!tokens.length) {
            return []
        }
        
        // map token prices to internal structure
        return tokens.map(
            token => {
                // find Binance listing symbol for this token
                const listingSymbol = token.marketListings.find(
                    market => market.id === MarketListingId.Binance
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
        ).filter(Boolean) as Array<BinanceTokenPrice>
    }

    /**
     * Maps Binance token volume data to internal token volume structure.
     *
     * @param param - Parameters for getting token volumes
     * @param param.tokenVolumeDataArray - Array of symbol + volume from Binance API
     * @returns Array of token volumes with token identification
     *
     * @example
     * const volumes = service.getBinanceTokenVolumes({ tokenVolumeDataArray: [{ symbol: "BTCUSDT", volume: 100 }] })
     */
    getBinanceTokenVolumes({
        tokenVolumeDataArray,
    }: GetBinanceTokenVolumesParams): Array<BinanceTokenVolume> {
        const tokens = this.primaryMemoryStorageService.tokenCollection.find({
            marketListings: {
                $elemMatch: {
                    id: MarketListingId.Binance,
                },
            },
        })
        if (!tokens.length) return []
        return tokens.map(
            token => {
                const listingSymbol = token.marketListings.find(
                    market => market.id === MarketListingId.Binance
                )?.symbol
                if (!listingSymbol) return undefined
                const tokenVolume = tokenVolumeDataArray.find(
                    d => d.symbol === listingSymbol
                )
                if (!tokenVolume) return undefined
                return {
                    tokenId: token.displayId,
                    id: token.id,
                    volume: tokenVolume.volume,
                }
            }
        ).filter(Boolean) as Array<BinanceTokenVolume>
    }
}
