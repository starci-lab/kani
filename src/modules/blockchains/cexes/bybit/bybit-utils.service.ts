import { Injectable } from "@nestjs/common"
import { MarketId, PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import { BybitTokenPrice, BybitTokenPriceData } from "./types"

@Injectable()
export class BybitUtilsService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Get Bybit symbols (unique) for tokens that are listed on Bybit.
     */
    getBybitSymbols(): Array<string> {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(token => !!token.marketListings.find(market => market.id === MarketId.Bybit))

        if (!tokens.length) return []

        return [...new Set(
            tokens
                .map(token => token.marketListings.find(market => market.id === MarketId.Bybit)?.symbol)
                .filter(Boolean) as Array<string>
        )]
    }

    /**
     * Map Bybit price updates (symbol -> price) into tokenId -> price.
     */
    getBybitTokenPrices(tokenPriceData: Array<BybitTokenPriceData>): Array<BybitTokenPrice> {
        const tokens = this.primaryMemoryStorageService.tokens
        return tokens.map(token => {
            const listingSymbol = token.marketListings.find(market => market.id === MarketId.Bybit)?.symbol
            if (!listingSymbol) return undefined
            const tokenPrice = tokenPriceData.find(d => d.symbol === listingSymbol)
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
    getBybitTokenIdBySymbol(symbol: string): TokenId | undefined {
        const token = this.primaryMemoryStorageService.tokens.find(
            token => token.marketListings.find(market => market.id === MarketId.Bybit)?.symbol === symbol
        )
        return token?.displayId
    }
}


