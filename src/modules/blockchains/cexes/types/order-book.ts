/**
 * Represents the order book data structure with best bid and ask prices and quantities.
 */
export interface OrderBook {
    /** Best bid price. */
    bidPrice: number
    /** Best bid quantity. */
    bidQty: number
    /** Best ask price. */
    askPrice: number
    /** Best ask quantity. */
    askQty: number
}