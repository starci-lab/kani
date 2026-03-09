/**
 * Bybit WS v5 ticker update payload (data field).
 * @see Bybit WebSocket v5 API tickers topic
 */
export interface BybitTickerData {
    /** Symbol, e.g. "BTCUSDT". */
    symbol: string
    /** Tick direction, e.g. "PlusTick" or "MinusTick". */
    tickDirection?: string
    /** Percentage change last 24h. */
    price24hPcnt: string
    /** Last price. */
    lastPrice: string
    /** Price 24h ago. */
    prevPrice24h?: string
    /** Highest price last 24h. */
    highPrice24h?: string
    /** Lowest price last 24h. */
    lowPrice24h?: string
    /** Best bid price. */
    bid1Price?: string
    /** Best bid size. */
    bid1Size?: string
    /** Best ask price. */
    ask1Price?: string
    /** Best ask size. */
    ask1Size?: string
    /** Volume last 24h. */
    volume24h?: string
    /** Turnover last 24h. */
    turnover24h?: string
}

/**
 * Bybit WS v5 ticker update message.
 */
export interface BybitTickerUpdate {
    /** Topic, e.g. "tickers.BTCUSDT". */
    topic: string
    /** Type, e.g. "snapshot" or "delta". */
    type: string
    /** Timestamp in milliseconds. */
    ts: number
    /** Cross sequence (optional). */
    cs?: number
    /** Ticker data. */
    data: BybitTickerData
}

/**
 * Bybit WebSocket subscription confirmation.
 */
export interface BybitWsSubscribeResult {
    /** True if subscription succeeded. */
    success: boolean
    /** Return message from server, e.g. "subscribe". */
    ret_msg: string
    /** Unique connection id for the WebSocket session. */
    conn_id: string
    /** Operation type, usually "subscribe". */
    op: "subscribe" | string
}
