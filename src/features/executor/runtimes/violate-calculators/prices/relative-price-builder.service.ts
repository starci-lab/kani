import {
    PricePoint,
} from "@modules/databases"
import {
    Injectable,
} from "@nestjs/common"
import type {
    BuildRelativePriceParams,
    BuildRelativePriceResult,
} from "../../types"
import {
    InfluxdbPriceCacheService,
} from "../../influxdb-cache"
import {
    AsyncService
} from "@modules/mixin"

/**
 * Service for building relative price series (A / B) using linear interpolation on B.
 */
@Injectable()
export class RelativePriceBuilderService {
    constructor(
        private readonly influxdbPriceCacheService: InfluxdbPriceCacheService,
        private readonly asyncService: AsyncService,
    ) { }

    /**
     * Build relative price series for two tokens in the given time window.
     * Uses same interpolated logic as inspector: for each A(t), interpolate B(t) and output A(t)/B(t).
     *
     * @param params - tokenAId, tokenBId, cexId, timeInterval
     * @returns Relative price points (price = A / B_interpolated)
     *
     * @example
     * const points = await service.buildRelativePrice({ tokenAId: "a", tokenBId: "b", cexId: "binance", timeInterval: { startMs: 0, endMs: Date.now() } })
     */
    async buildRelativePrice(
        {
            tokenAId,
            tokenBId,
            cexAId,
            cexBId,
            timeIntervalMs,
        }: BuildRelativePriceParams
    ): Promise<BuildRelativePriceResult> {
        const [
            pricePointsA,
            pricePointsB,
        ] = await this.asyncService.allMustDone([
            this.influxdbPriceCacheService.getPoints({
                tokenId: tokenAId,
                cexId: cexAId,
                timeIntervalMs,
            }),
            this.influxdbPriceCacheService.getPoints({
                tokenId: tokenBId,
                cexId: cexBId,
                timeIntervalMs,
            }),
        ])
        return this.buildRelativeSeriesInterpolated(
            pricePointsA,
            pricePointsB,
        )
    }

    /**
     * Build relative price series using linear interpolation on B.
     *
     * For each A(t):
     * - Find B0.time <= t <= B1.time
     * - Interpolate B(t)
     * - relative(t) = A(t) / B(t)
     *
     * @param a - Price points for token A (numerator)
     * @param b - Price points for token B (denominator, interpolated)
     * @returns Relative price points
     */
    private buildRelativeSeriesInterpolated(
        a: Array<PricePoint>,
        b: Array<PricePoint>,
    ): Array<PricePoint> {
        const A = [...a].sort((x, y) => x.time - y.time)
        const B = [...b].sort((x, y) => x.time - y.time)

        const out: Array<PricePoint> = []

        let j = 0

        for (const pa of A) {
            while (j + 1 < B.length && B[j + 1].time < pa.time) {
                j++
            }

            const left = B[j]
            const right = B[j + 1]

            if (!left || !right) continue
            if (pa.time < left.time || pa.time > right.time) continue
            if (!Number.isFinite(left.price) || !Number.isFinite(right.price)) continue
            if (left.price <= 0 || right.price <= 0) continue

            const span = right.time - left.time
            if (span <= 0) continue

            const alpha = (pa.time - left.time) / span
            if (alpha < 0 || alpha > 1) continue
            if (!Number.isFinite(pa.price)) continue

            const interpolatedBase = left.price + alpha * (right.price - left.price)

            out.push({
                ...pa,
                price: pa.price / interpolatedBase,
            })
        }

        return out
    }
}


