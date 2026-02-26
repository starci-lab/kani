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
        if (!prices) {
            return null
        }

        const marketListings = [...token.marketListings].sort(
            (prev, next) => prev.priority - next.priority,
        )

        const observedPrices = marketListings
            .map((marketListing) => prices[marketListing.id]?.price)
            .filter(
                (price): price is number =>
                    typeof price === "number" && !isNaN(price),
            )

        if (observedPrices.length === 0) {
            return null
        }

        const medianPrice = median(observedPrices)

        const isPriceOutlier = (price: number): boolean =>
            new Decimal(price)
                .minus(medianPrice)
                .abs()
                .div(medianPrice)
                .gt(maxDeviationRatio)

        let bestStaleCandidate: StaleCandidate | null = null

        for (const marketListing of marketListings) {
            const priceEntry = prices[marketListing.id]
            if (!priceEntry) continue
            if (isPriceOutlier(priceEntry.price)) continue

            const ageMs = now.diff(priceEntry.snapshotAt,
                "millisecond")
            const isStale = ageMs > maxAgeMs
            if (!isStale) {
                return {
                    price: new Decimal(priceEntry.price),
                    isStale: false,
                    ageMs,
                }
            }
            if (!bestStaleCandidate) {
                bestStaleCandidate = {
                    price: new Decimal(priceEntry.price),
                    ageMs,
                }
            }
        }

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
