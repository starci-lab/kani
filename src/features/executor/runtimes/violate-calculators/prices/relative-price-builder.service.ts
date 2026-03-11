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
    
        const times = Array.from(
            new Set([
                ...A.map(p => p.time),
                ...B.map(p => p.time),
            ])
        ).sort((x, y) => x - y)
    
        const out: Array<PricePoint> = []
    
        let ia = 0
        let ib = 0
    
        const interpolate = (
            t: number,
            arr: Array<PricePoint>,
            idxRef: { i: number },
        ): number | null => {
            let i = idxRef.i
    
            while (i + 1 < arr.length && arr[i + 1].time < t) {
                i++
            }
    
            idxRef.i = i
    
            const left = arr[i]
            const right = arr[i + 1]
    
            if (!left) return null
    
            if (t === left.time) return left.price
            if (right && t === right.time) return right.price
    
            if (!right) return null
            if (t < left.time || t > right.time) return null
    
            const span = right.time - left.time
            if (span <= 0) return null
    
            const alpha = (t - left.time) / span
            if (alpha < 0 || alpha > 1) return null
    
            return left.price + alpha * (right.price - left.price)
        }
    
        const refA = { i: ia }
        const refB = { i: ib }
    
        for (const t of times) {
            const pa = interpolate(t, A, refA)
            const pb = interpolate(t, B, refB)
    
            if (!Number.isFinite(pa) || !Number.isFinite(pb)) continue
            if (pb! <= 0) continue
    
            out.push({
                ...A[0],
                time: t,
                price: pa! / pb!,
            })
        }
        return out
    }
}


