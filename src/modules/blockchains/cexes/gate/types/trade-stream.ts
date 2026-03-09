/**
 * Single trade in Gate.io spot.trades channel.
 * @see https://www.gate.io/docs/developers/apiv4/ws/en/
 */
export interface GateTradeResult {
    /** Currency pair, e.g. "SOL_USDT". */
    currency_pair: string
    /** Trade price. */
    price: string
    /** Trade amount (base asset). */
    amount: string
    /** Trade ID. */
    id?: number
    /** Trade time (seconds). */
    time?: number
}

/**
 * Gate.io spot.trades WebSocket update message.
 */
export interface GateTradeUpdate {
    /** Timestamp in seconds. */
    time: number
    /** Timestamp in milliseconds. */
    time_ms?: number
    /** Channel, e.g. "spot.trades". */
    channel: "spot.trades"
    /** Event type, e.g. "update". */
    event: "update"
    /** Trade result. */
    result: GateTradeResult
}
