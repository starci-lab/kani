import {
    Injectable,
    OnModuleInit,
} from "@nestjs/common"
import {
    MarketListingId,
    PrimaryMemoryStorageService,
    TokenSchema,
} from "@modules/databases"
import type {
    GateTokenPrice,
    GateTokenVolume,
    ResolveGateTokenPricesParams,
    ResolveGateTokenVolumesParams,
} from "./types"
import {
    ReadinessWatcherFactoryService 
} from "@modules/mixin"

/**
 * Service responsible for managing Gate.io token registry and symbol mappings.
 * Provides functionality to retrieve Gate.io symbols and map token prices.
 *
 * @example
 * const service = new GateTokenRegistryService(...)
 * const priceSymbols = service.getPriceSymbols(); const volumeSymbols = service.getVolumeSymbols()
 * const prices = service.getTokenPrices({ tokenPriceDataArray: gateData })
 */
@Injectable()
export class GateTokenRegistryService implements OnModuleInit {
    private tokenMap: Map<string, TokenSchema> = new Map()
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    ) {}

    async onModuleInit() {
        // wait until primary memory storage is ready
        await this.readinessWatcherFactoryService.waitUntilReady(PrimaryMemoryStorageService.name)
        this.tokenMap = new Map(
            Array.from(this.primaryMemoryStorageService.tokenMap.values()).filter(
                (token) => token.marketListings?.some((market) => market.id === MarketListingId.Gate),
            ).map((token) => [token.id,
                token])
        )
    }
    /**
     * Gets Gate.io symbols for ticker (price) stream.
     *
     * @returns Array of currency pairs (e.g. "SOL_USDT")
     */
    getPriceSymbols(): Array<string> {
        return this.getSymbols()
    }

    /**
     * Gets Gate.io symbols for trade (volume) stream.
     *
     * @returns Array of currency pairs (e.g. "SOL_USDT")
     */
    getVolumeSymbols(): Array<string> {
        return this.getSymbols()
    }

    private getSymbols(): Array<string> {
        const tokens = Array.from(this.tokenMap.values())
        if (!tokens.length) return []
        return [
            ...new Set(
                tokens
                    .map((token) =>
                        token.marketListings.find(
                            (marketListing) =>
                                marketListing.id === MarketListingId.Gate,
                        )?.symbol ?? "",
                    )
                    .filter(Boolean),
            ),
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
     * const prices = service.getTokenPrices({ tokenPriceDataArray: gateData })
     */
    getTokenPrices({ tokenPriceDataArray }: ResolveGateTokenPricesParams): Array<GateTokenPrice> {
        // find all tokens with Gate.io market listings
        const tokens = Array.from(this.tokenMap.values())
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
     * const volumes = service.getTokenVolumes({ tokenVolumeDataArray: [{ symbol: "SOL_USDT", volume: 100 }] })
     */
    getTokenVolumes({ tokenVolumeDataArray }: ResolveGateTokenVolumesParams): Array<GateTokenVolume> {
        const tokens = Array.from(this.tokenMap.values())
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


