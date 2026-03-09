/**
 * Gate.io spot ticker result (nested in ticker update).
 */
export interface GateTickerResult {
    /** Currency pair, e.g. "SOL_USDT". */
    currency_pair: string
    /** Last price. */
    last: string
    /** Lowest ask price. */
    lowest_ask: string
    /** Highest bid price. */
    highest_bid: string
    /** 24h change percentage. */
    change_percentage: string
    /** Base currency volume. */
    base_volume: string
    /** Quote currency volume. */
    quote_volume: string
    /** 24h high price. */
    high_24h: string
    /** 24h low price. */
    low_24h: string
}

/**
 * Gate.io spot ticker WebSocket update message.
 */
export interface GateTickerUpdate {
    /** Timestamp in seconds. */
    time: number
    /** Timestamp in milliseconds. */
    time_ms: number
    /** Channel, e.g. "spot.tickers". */
    channel: "spot.tickers"
    /** Event type, e.g. "update". */
    event: "update"
    /** Ticker result. */
    result: GateTickerResult
}
