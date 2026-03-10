import type {
    CexId,
    PricePoint,
} from "@modules/databases"
import type {
    TimeInterval,
} from "./influxdb-cache"

/** Params for building relative price series (token A / token B) with interpolated base. */
export interface BuildRelativePriceParams {
    /** Token A (numerator) ID. */
    tokenAId: string
    /** Token B (denominator) ID. */
    tokenBId: string
    /** CEX A ID used for both tokens. */
    cexAId: CexId
    /** CEX B ID used for both tokens. */
    cexBId: CexId
    /** Time window for price points. */
    timeInterval: TimeInterval
}

/** Result of building relative price: series of price points with price = A(t) / B_interpolated(t). */
export type BuildRelativePriceResult = Array<PricePoint>
