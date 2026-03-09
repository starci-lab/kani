/**
 * WebSocket URL for Bybit spot public stream API.
 */
export const BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/spot"

/**
 * WebSocket URL for Bybit order book stream API.
 */
export const BYBIT_ORDER_BOOK_WS_URL = "wss://stream.bybit.com/spot/quote/ws/v2"

/**
 * Stream name identifier for Bybit last price updates.
 */
export const BYBIT_LAST_PRICE_STREAM_NAME = "bybit-last-price"

/**
 * Stream name identifier for Bybit order book updates.
 */
export const BYBIT_ORDER_BOOK_STREAM_NAME = "bybit-order-book"

/**
 * Stream name identifier for Bybit trade volume (per-fill volume).
 */
export const BYBIT_TRADE_VOLUME_STREAM_NAME = "bybit-trade-volume"
