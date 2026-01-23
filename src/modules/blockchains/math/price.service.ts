import {
    Injectable 
} from "@nestjs/common"
import Decimal from "decimal.js"
import {
    envConfig 
} from "@modules/env"
import {
    AsyncService, DayjsService 
} from "@modules/mixin"
import {
    AggregatedTokenPriceNotFoundException,
} from "@modules/exceptions"
import {
    TokenSchema 
} from "@modules/databases"
import {
    median 
} from "simple-statistics"
import {
    AggregatedTokenPriceCacheService 
} from "@modules/cache"

@Injectable()
export class PriceService {
    constructor(
        private readonly dayjsService: DayjsService,
        private readonly aggregatedTokenPriceCacheService: AggregatedTokenPriceCacheService,
        private readonly asyncService: AsyncService 
    ) {}

    /**
     * Resolves the best available price for a token.
     *
     * Pricing policy:
     * - Prices are evaluated in market priority order (lower priority value = higher priority).
     * - Prices that deviate too far from the median are rejected as outliers.
     * - Non-stale prices are preferred.
     * - If all valid prices are stale, the best stale price is returned
     *   and marked as stale.
     */
    async resolvePrice(
        { token }: ResolvePriceParams,
    ): Promise<ResolvePriceResult> {
        const aggregated =
            await this.aggregatedTokenPriceCacheService.get(token.displayId)
        const now = this.dayjsService.now()
        const maxAgeMs = envConfig().cache.stale.priceMaxAgeMs
        const maxDeviationRatio = envConfig().price.deviationMaxRatio

        // Sort markets by priority
        const marketListings = [...token.marketListings]
            .sort(
                (marketListingPrev, marketListingNext) => 
                    marketListingPrev.priority - marketListingNext.priority
            )

        // Collect prices for median calculation
        const observedPrices: Array<number> = marketListings
            .map(
                (marketListing) =>
                    aggregated.prices[marketListing.id]?.price,
            )
            .filter(
                (price): price is number =>
                    typeof price === "number" && !isNaN(price),
            )

        if (observedPrices.length === 0) {
            throw new AggregatedTokenPriceNotFoundException(
                {
                    tokenId: token.displayId
                }
            )
        }

        const medianPrice = median(observedPrices)

        const isPriceOutlier = (price: number): boolean => {
            return new Decimal(price)
                .minus(medianPrice)
                .abs()
                .div(medianPrice)
                .gt(maxDeviationRatio)
        }

        let bestStaleCandidate: {
            price: Decimal
            ageMs: number
        } | null = null

        for (const market of marketListings) {
            const priceEntry = aggregated.prices[market.id]
            if (!priceEntry) continue
            if (isPriceOutlier(priceEntry.price)) continue

            const ageMs = now.diff(
                priceEntry.snapshotAt,
                "millisecond",
            )
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

        throw new AggregatedTokenPriceNotFoundException(
            {
                tokenId: token.displayId
            }
        )
    }

    /**
     * Resolves a price quote between two tokens (A / B).
     *
     * - Quote price = priceA / priceB
     * - isStale = true if either side is stale
     * - ageMs = max(ageA, ageB)
     */
    async resolveRelativePrice(
        { tokenA, tokenB }: ResolveRelativePriceParams,
    ): Promise<ResolveRelativePriceResult> {
        const [
            priceA, 
            priceB
        ] = await this.asyncService.allMustDone([
            this.resolvePrice({
                token: tokenA 
            }),
            this.resolvePrice({
                token: tokenB 
            }),
        ])
        const relativePrice = priceA.price.div(priceB.price)
        return {
            price: relativePrice,
            ageMs: Math.max(priceA.ageMs,
                priceB.ageMs),
            isStale: priceA.isStale || priceB.isStale,
        }
    }
}

/* =======================
 * Interfaces
 * ======================= */

export interface ResolvePriceParams {
    token: TokenSchema
}

export interface ResolvePriceResult {
    price: Decimal
    isStale: boolean
    /**
     * Milliseconds since the price snapshot was taken
     */
    ageMs: number
}

export interface ResolveRelativePriceParams {
    tokenA: TokenSchema
    tokenB: TokenSchema
}

export interface ResolveRelativePriceResult {
    /**
     * Relative price: tokenA / tokenB
     */
    price: Decimal
    ageMs: number
    isStale: boolean
}