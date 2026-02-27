import {
    Injectable,
} from "@nestjs/common"
import Decimal from "decimal.js"
import {
    median,
} from "simple-statistics"
import type {
    ResolvePriceSelectionParams,
    ResolvePriceSelectionResult,
    StaleCandidate,
} from "./types"

/**
 * Service that picks the best price from a token's market listings using
 * median-based outlier filtering and staleness checks (same policy as PriceService).
 *
 * @example
 * const result = this.priceSelectionService.resolveByMarketPriority({ token, prices, now, maxAgeMs, maxDeviationRatio })
 */
@Injectable()
export class PriceSelectionService {
    /**
     * Resolves the best available price by market priority.
     * Returns null when no market provides a usable price.
     *
     * @param param - Token, prices map, now, maxAgeMs, maxDeviationRatio
     * @returns Resolved price with staleness info, or null
     *
     * @example
     * const resolved = this.priceSelectionService.resolveByMarketPriority({ token, prices, now, maxAgeMs, maxDeviationRatio })
     */
    resolveByMarketPriority({
        token,
        prices,
        now,
        maxAgeMs,
        maxDeviationRatio,
    }: ResolvePriceSelectionParams): ResolvePriceSelectionResult | null {
        // if the prices are not found, return null
        if (!prices) {
            return null
        }
        // get the market listings
        const marketListings = [...token.marketListings].sort(
            (prev, next) => prev.priority - next.priority,
        )
        // get the observed prices
        const observedPrices = marketListings
            .map((marketListing) => prices[marketListing.id]?.price)
            .filter(
                (price): price is number =>
                    typeof price === "number" && !isNaN(price),
            )
        // if the observed prices are empty, return null
        if (observedPrices.length === 0) {
            return null
        }
        // get the median price
        const medianPrice = median(observedPrices)

        // check if the price is an outlier
        const isPriceOutlier = (price: number): boolean =>
            new Decimal(price)
                .minus(medianPrice)
                .abs()
                .div(medianPrice)
                .gt(maxDeviationRatio)

        // initialize the best stale candidate
        let bestStaleCandidate: StaleCandidate | null = null
        // iterate over the market listings
        for (const marketListing of marketListings) {
            // get the price entry
            const priceEntry = prices[marketListing.id]
            // if the price entry is not found, continue
            if (!priceEntry) continue
            if (isPriceOutlier(priceEntry.price)) continue
            // get the age in milliseconds
            const ageMs = now.diff(priceEntry.snapshotAt,
                "millisecond")
            // check if the price is stale
            const isStale = ageMs > maxAgeMs
            // if the price is not stale, return the price
            if (!isStale) {
                return {
                    price: new Decimal(priceEntry.price),
                    isStale: false,
                    ageMs,
                }
            }
            // if the best stale candidate is not found, set the best stale candidate
            if (!bestStaleCandidate) {
                bestStaleCandidate = {
                    price: new Decimal(priceEntry.price),
                    ageMs,
                }
            }
        }

        // if the best stale candidate is found, return the best stale candidate
        if (bestStaleCandidate) {
            return {
                price: bestStaleCandidate.price,
                isStale: true,
                ageMs: bestStaleCandidate.ageMs,
            }
        }

        return null
    }
}
