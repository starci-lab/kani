import type {
    DynamicLiquidityPoolInfoCacheResult,
    ViolateIndicatorResultEntry,
} from "@modules/cache"
import {
    ReceivedToken 
} from "@modules/event"

/** Single dynamic liquidity pool info in publication payload. */
export type PublicationDynamicLiquidityPoolInfo = DynamicLiquidityPoolInfoCacheResult

/** Event payload for dynamic liquidity pools info publication. */
export interface PublicationDynamicLiquidityPoolsInfoEventPayload {
    results: Record<string, PublicationDynamicLiquidityPoolInfo>
}

/** Single price in publication payload. */
export interface PublicationPrice {
    price: number
}

/** Event payload for price publication. */
export interface PublicationPriceEventPayload {
    results: Record<string, PublicationPrice>
}

/** Event payload for confirm withdrawal publication. */
export interface PublicationConfirmWithdrawalEventPayload {
    botId: string
    txHashes: Array<string>
    receivedTokens: Array<ReceivedToken>
}

/** Event payload for indicators publication. */
export interface PublicationIndicatorsEventPayload {
    entries: Array<ViolateIndicatorResultEntry>
}