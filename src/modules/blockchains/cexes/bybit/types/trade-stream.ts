/**
 * Single trade in Bybit publicTrade stream.
 * @see https://bybit-exchange.github.io/docs/v5/websocket/public/trade
 */
export interface BybitTradeEvent {
    /** Timestamp (ms) when the order was filled. */
    T: number
    /** Symbol, e.g. "BTCUSDT". */
    s: string
    /** Side of taker: "Buy" | "Sell". */
    S: string
    /** Trade size (base asset). */
    v: string
    /** Trade price. */
    p: string
    /** Trade ID. */
    i: string
    /** Whether block trade. */
    BT?: boolean
    /** Cross sequence. */
    seq?: number
}

/**
 * Bybit publicTrade WebSocket message (may contain up to 1024 trades).
 */
export interface BybitTradeUpdate {
    /** Topic, e.g. "publicTrade.BTCUSDT". */
    topic: string
    /** Data type, e.g. "snapshot". */
    type: string
    /** System timestamp (ms). */
    ts: number
    /** Trade list. */
    data: Array<BybitTradeEvent>
}
