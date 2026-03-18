/** Event payload for subscribing to dynamic liquidity pools info. */
export interface SubscribeDynamicLiquidityPoolsInfoEventPayload {
    ids: Array<string>
}

/** Event payload for subscribing to prices. */
export interface SubscribePricesEventPayload {
    ids: Array<string>
}


/** Event payload for subscribing to confirm withdrawal. */
export interface SubscribeConfirmWithdrawalEventPayload {
    botId: string
}

/** Event payload for subscribing to violate indicators (by bot id). */
export interface SubscribeIndicatorsEventPayload {
    botId: string
}