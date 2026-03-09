/**
 * Single fill (trade) event from Binance WebSocket trade stream.
 * @see https://binance-docs.github.io/apidocs/spot/en/#trade-streams
 */
export interface BinanceTradeEvent {
    /** Event type. */
    e: string
    /** Event time (ms). */
    E: number
    /** Symbol, e.g. "SUIUSDT". */
    s: string
    /** Trade ID. */
    t: number
    /** Price. */
    p: string
    /** Quantity (base asset). */
    q: string
    /** Buyer order ID. */
    b: number
    /** Seller order ID. */
    a: number
    /** Trade time. */
    T: number
    /** Is buyer market maker. */
    m: boolean
    /** Ignore. */
    M: boolean
}

/** Trade stream message (stream name + trade data). */
export interface BinanceTradeStream {
    /** Stream name, e.g. "suiusdt@trade". */
    stream: string
    /** Trade event payload. */
    data: BinanceTradeEvent
}

/** Subscription acknowledgment for trade stream. */
export interface BinanceTradeStreamAck {
    /** Null result. */
    result: null
    /** Request ID. */
    id: number
}
