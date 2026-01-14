import { Injectable } from "@nestjs/common"
import { MarketId, PrimaryMemoryStorageService, TokenId } from "@modules/databases"
import { GateTokenPrice, GateTokenPriceData } from "./types"

@Injectable()
export class GateUtilsService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Get Gate symbols (unique) for tokens that are listed on Gate.
     */
    getGateSymbols(): Array<string> {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(token => !!token.marketListings.find(market => market.id === MarketId.Gate))

        if (!tokens.length) return []

        return [...new Set(
            tokens
                .map(token => token.marketListings.find(market => market.id === MarketId.Gate)?.symbol)
                .filter(Boolean) as Array<string>
        )]
    }

    /**
     * Map Gate price updates (symbol -> price) into tokenId -> price.
     */
    getGateTokenPrices(tokenPriceData: Array<GateTokenPriceData>): Array<GateTokenPrice> {
        const tokens = this.primaryMemoryStorageService.tokens
        return tokens.map(token => {
            const listingSymbol = token.marketListings.find(market => market.id === MarketId.Gate)?.symbol
            if (!listingSymbol) return undefined
            const tokenPrice = tokenPriceData.find(d => d.symbol === listingSymbol)
            if (!tokenPrice) return undefined
            return {
                tokenId: token.displayId,
                price: tokenPrice.price,
            }
        }).filter(Boolean) as Array<GateTokenPrice>
    }

    /**
     * Resolve a Gate symbol to a tokenId (if present in memory).
     */
    getGateTokenIdBySymbol(symbol: string): TokenId | undefined {
        const token = this.primaryMemoryStorageService.tokens.find(
            token => token.marketListings.find(market => market.id === MarketId.Gate)?.symbol === symbol
        )
        return token?.displayId
    }
}


