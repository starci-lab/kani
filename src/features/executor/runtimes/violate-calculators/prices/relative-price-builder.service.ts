import {
    PricePoint,
} from "@modules/databases"
import {
    Injectable,
} from "@nestjs/common"
import type {
    BuildRelativePriceParams,
    BuildRelativePriceResult,
} from "../types"
import {
    InfluxdbPriceCacheService,
} from "../influxdb-cache"
import {
    AsyncService
} from "@modules/mixin"
import { 
    DayjsService 
} from "@modules/mixin"

/**
 * Service for building relative price series (A / B) using linear interpolation on B.
 */
@Injectable()
export class RelativePriceBuilderService {
    constructor(
        private readonly influxdbPriceCacheService: InfluxdbPriceCacheService,
        private readonly asyncService: AsyncService,
        private readonly dayjsService: DayjsService,
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
        const now = this.dayjsService.now()
        const [
            pricePointsA,
            pricePointsB,
        ] = await this.asyncService.allMustDone([
            this.influxdbPriceCacheService.getPoints({
                tokenId: tokenAId,
                cexId: cexAId,
                timeIntervalMs,
                snapshotMs: now.toDate().getTime(),
            }),
            this.influxdbPriceCacheService.getPoints({
                tokenId: tokenBId,
                cexId: cexBId,
                timeIntervalMs,
                snapshotMs: now.toDate().getTime(),
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
    
        const anchorIsB = B.length >= A.length
    
        const anchor = anchorIsB ? B : A
        const other = anchorIsB ? A : B
    
        const out: Array<PricePoint> = []
    
        let j = 0
    
        for (const p of anchor) {
    
            while (j + 1 < other.length && other[j + 1].time <= p.time) {
                j++
            }
    
            const left = other[j]
            const right = other[j + 1]
    
            if (!left) continue
    
            let interp: number | null = null
    
            if (p.time === left.time) {
                interp = left.price
            } else if (right && p.time === right.time) {
                interp = right.price
            } else {
    
                if (!right) continue
                if (p.time < left.time || p.time > right.time) continue
    
                const span = right.time - left.time
                if (span <= 0) continue
    
                const alpha = (p.time - left.time) / span
                interp = left.price + alpha * (right.price - left.price)
            }
    
            if (!Number.isFinite(interp)) continue
            if (!Number.isFinite(p.price)) continue
    
            let relative: number
    
            if (anchorIsB) {
                relative = p.price / interp
            } else {
                relative = interp / p.price
            }
    
            out.push({
                ...p,
                price: relative,
            })
        }
    
        return out
    }
}


