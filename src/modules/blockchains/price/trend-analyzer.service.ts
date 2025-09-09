import { Injectable } from "@nestjs/common"
import { PriceTrend } from "./types"

/**
 * Order book snapshot type: list of [price, quantity]
 */
export interface OrderBook {
  bids: Array<[string, string]>
  asks: Array<[string, string]>
}

/**
 * Parameters for order book analysis
 */
export interface AnalyzeOrderBookParams {
  /** Order book data */
  orderBook: OrderBook

  /** Number of levels to analyze (default 20) */
  depth?: number

  /** Current last price (used to filter out spoof orders) */
  currentPrice?: number

  /** Allowed deviation from currentPrice (default ±1%) */
  tolerance?: number
}

/**
 * Service for analyzing market trend based on order book data
 */
@Injectable()
export class TrendAnalyzerService {
    /**
   * Analyze order book imbalance to determine short-term trend
   * @param params AnalyzeOrderBookParams
   * @returns Diagnostic data and predicted trend
   */
    analyze({
        orderBook,
        depth = 20,
        currentPrice,
        tolerance = 0.01,
    }: AnalyzeOrderBookParams) {
        // Take top N bid and ask levels
        let topBids = orderBook.bids.slice(0, depth)
        let topAsks = orderBook.asks.slice(0, depth)

        // If currentPrice is provided, filter out spoof orders outside tolerance range
        if (currentPrice) {
            const minPrice = currentPrice * (1 - tolerance)
            const maxPrice = currentPrice * (1 + tolerance)

            topBids = topBids.filter(([price]) => parseFloat(price) >= minPrice)
            topAsks = topAsks.filter(([price]) => parseFloat(price) <= maxPrice)
        }

        // Calculate total volumes
        const bidVolume = topBids.reduce((sum, [, qty]) => sum + parseFloat(qty), 0)
        //10k, 10000k
        const askVolume = topAsks.reduce((sum, [, qty]) => sum + parseFloat(qty), 0)
        //11k, 11000k
        // Imbalance ratio: positive = buy pressure, negative = sell pressure
        const imbalance = (bidVolume - askVolume) / (bidVolume + askVolume)

        // Decide trend based on imbalance thresholds
        let trend: PriceTrend
        if (imbalance > 0.1) trend = PriceTrend.Up
        else if (imbalance < -0.1) trend = PriceTrend.Down
        else trend = PriceTrend.Sideway

        // Return diagnostic info
        return {
            bidVolume,                 // total buy-side liquidity
            askVolume,                 // total sell-side liquidity
            imbalance: imbalance.toFixed(2), // imbalance ratio as string
            trend,                     // predicted short-term trend
            currentPrice,              // reference price (if provided)
        }
    }
}
