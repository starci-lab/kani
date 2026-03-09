/**
 * Payload of a 24-hour ticker event from Binance WebSocket stream.
 * @see https://binance-docs.github.io/apidocs/spot/en/#individual-symbol-ticker-streams
 */
export interface Ticker24hrEvent {
    /** Event type, e.g. "24hrTicker". */
    e: string
    /** Event time (ms). */
    E: number
    /** Symbol, e.g. "SUIUSDT". */
    s: string
    /** Price change. */
    p: string
    /** Price change percent. */
    P: string
    /** Weighted average price. */
    w: string
    /** Previous day close price. */
    x: string
    /** Current close price. */
    c: string
    /** Close trade quantity. */
    Q: string
    /** Best bid price. */
    b: string
    /** Best bid quantity. */
    B: string
    /** Best ask price. */
    a: string
    /** Best ask quantity. */
    A: string
    /** Open price. */
    o: string
    /** High price. */
    h: string
    /** Low price. */
    l: string
    /** Total traded base asset volume. */
    v: string
    /** Total traded quote asset volume. */
    q: string
    /** Statistics open time. */
    O: number
    /** Statistics close time. */
    C: number
    /** First trade ID. */
    F: number
    /** Last trade ID. */
    L: number
    /** Total number of trades. */
    n: number
}

/** Ticker stream message (stream name + event data). */
export interface Ticker24hrStream {
    /** Stream name, e.g. "suiusdt@ticker". */
    stream: string
    /** Ticker event payload. */
    data: Ticker24hrEvent
}

/** Subscription acknowledgment from Binance WebSocket. */
export interface NullTicker24hrStream {
    /** Null result. */
    result: null
    /** Request ID. */
    id: number
}
