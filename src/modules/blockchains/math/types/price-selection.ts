import type {
    TokenSchema,
} from "@modules/databases"
import type {
    AggregatedTokenPriceCacheResult,
} from "@modules/cache"
import type {
    Dayjs,
} from "dayjs"
import type Decimal from "decimal.js"

/** Params for resolving best price by market priority (median, outlier, staleness). */
export interface ResolvePriceSelectionParams {
    /** Token whose market listings define priority order. */
    token: TokenSchema
    /** Price map by market listing id (e.g. aggregated.prices or lastAggregatedTokenPrice.prices). */
    prices: AggregatedTokenPriceCacheResult["prices"] | undefined
    /** Reference time for staleness. */
    now: Dayjs
    /** Max age in ms before price is considered stale. */
    maxAgeMs: number
    /** Max deviation ratio from median to reject outlier. */
    maxDeviationRatio: number
}

/** Result of resolving price by market priority; null when no usable price. */
export interface ResolvePriceSelectionResult {
    price: Decimal
    isStale: boolean
    ageMs: number
}

/** A candidate price that is stale. */
export interface StaleCandidate {
    price: Decimal
    ageMs: number
}
