import {
    Injectable 
} from "@nestjs/common"
import {
    PrimaryInfluxdbWindowResultBucketService 
} from "@modules/databases"
import {
    envConfig 
} from "@modules/env"
import {
    AnalyzePriceWindowParams,
    PeakToNowMetrics,
    TroughToNowMetrics,
} from "./types"
import {
    PriceWindowShape,
    MomentumState,
    PriceWindowResult,
} from "@modules/databases"
import ss from "simple-statistics"
import type {
    PricePoint 
} from "@modules/databases"

/**
 * Service for computing price window stats (min/max/range/drawdown/trend)
 * + peak->now dump metrics + trough->now pump metrics.
 */
@Injectable()
export class PriceCalculationService {
    constructor(
    private readonly primaryInfluxdbWindowResultBucketService: PrimaryInfluxdbWindowResultBucketService,
    ) {}

    /**
   * Compute the maximum drawdown percentage.
   * (Peak-to-trough max drop within the window)
   */
    private maxDrawdownPct(xs: Array<number>): number {
        if (xs.length === 0) return 0
        let peak = xs[0]
        let maxDd = 0
        for (const p of xs) {
            if (p > peak) peak = p
            const dd = peak === 0 ? 0 : (peak - p) / peak
            if (dd > maxDd) maxDd = dd
        }
        return maxDd * 100
    }

    /**
   * Compute the efficiency ratio (0..1).
   * ~1: straight trend, ~0: choppy zigzag.
   */
    private efficiencyRatio(xs: Array<number>): number {
        if (xs.length <= 1) return 1
        const net = Math.abs(xs[xs.length - 1] - xs[0])
        const total = xs
            .slice(1)
            .reduce((acc, p, i) => acc + Math.abs(p - xs[i]),
                0)
        return total === 0 ? 1 : net / total
    }

    /**
   * Find the LAST occurrence index of a value.
   * Helps avoid "first peak" issue with repeated max/min values.
   */
    private lastIndexOfValue(xs: Array<number>, value: number): number {
        for (let i = xs.length - 1; i >= 0; i--) {
            if (xs[i] === value) return i
        }
        return -1
    }

    /**
   * Compute peak->now metrics (for dump/reversal detection).
   * Uses LAST peak occurrence for more accurate "recentness".
   */
    private peakToNowMetrics(sorted: Array<PricePoint>): PeakToNowMetrics {
        const xs = sorted.map((p) => p.price)
        const ts = sorted.map((p) => new Date(p.time).getTime())

        const peakPrice = ss.max(xs)
        const peakIndex = Math.max(0,
            this.lastIndexOfValue(xs,
                peakPrice))

        const lastIndex = xs.length - 1
        const lastPrice = xs[lastIndex]

        // negative when below peak
        const dropFromPeakPct =
      peakPrice === 0 ? 0 : ((lastPrice - peakPrice) / peakPrice) * 100

        const barsSincePeak = lastIndex - peakIndex
        const dtMs = ts[lastIndex] - ts[peakIndex]
        const dtMin = dtMs / 60000

        const slopeFromPeakPctPerBar =
      barsSincePeak > 0 ? dropFromPeakPct / barsSincePeak : 0

        const velFromPeakPctPerMin = dtMin > 0 ? dropFromPeakPct / dtMin : 0

        return {
            peakPrice,
            peakIndex,
            barsSincePeak,
            dropFromPeakPct,
            slopeFromPeakPctPerBar,
            velFromPeakPctPerMin,
            peakTime: sorted[peakIndex]?.time,
        }
    }

    /**
   * Compute trough->now metrics (for pump/recovery detection).
   * Uses LAST trough occurrence for more accurate "recentness".
   */
    private troughToNowMetrics(sorted: Array<PricePoint>): TroughToNowMetrics {
        const xs = sorted.map((p) => p.price)
        const ts = sorted.map((p) => new Date(p.time).getTime())

        const troughPrice = ss.min(xs)
        const troughIndex = Math.max(0,
            this.lastIndexOfValue(xs,
                troughPrice))

        const lastIndex = xs.length - 1
        const lastPrice = xs[lastIndex]

        // positive when above trough
        const riseFromTroughPct =
      troughPrice === 0 ? 0 : ((lastPrice - troughPrice) / troughPrice) * 100

        const barsSinceTrough = lastIndex - troughIndex
        const dtMs = ts[lastIndex] - ts[troughIndex]
        const dtMin = dtMs / 60000

        const slopeFromTroughPctPerBar =
      barsSinceTrough > 0 ? riseFromTroughPct / barsSinceTrough : 0
        const velFromTroughPctPerMin = dtMin > 0 ? riseFromTroughPct / dtMin : 0

        return {
            troughPrice,
            troughIndex,
            barsSinceTrough,
            riseFromTroughPct,
            slopeFromTroughPctPerBar,
            velFromTroughPctPerMin,
            troughTime: sorted[troughIndex]?.time,
        }
    }

    /**
     * Analyze the price window.
     * @param params - The parameters for analyzing the price window.
     * @param params.pricePoints - The price points.
     * @returns The price window result.
     */
    async analyzePriceWindow(
        { pricePoints }: AnalyzePriceWindowParams,
    ): Promise<PriceWindowResult | null> {
        // Ensure time ordering so "last" is meaningful
        const sorted = [...pricePoints].sort(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
        )

        const xs = sorted.map((p) => p.price)
        if (xs.length === 0) return null

        const firstPrice = xs[0]
        const lastPrice = xs[xs.length - 1]

        // prices
        const maxPrice = ss.max(xs)
        const minPrice = ss.min(xs)
        const diffPrice = maxPrice - minPrice

        // % stats
        const rangePct = minPrice === 0 ? 0 : ((maxPrice - minPrice) / minPrice) * 100
        const fromLowToLastPct = minPrice === 0 ? 0 : ((lastPrice - minPrice) / minPrice) * 100
        const fromHighToLastPct = maxPrice === 0 ? 0 : ((lastPrice - maxPrice) / maxPrice) * 100
        const drawdownPct = this.maxDrawdownPct(xs)

        // Volatility on returns (fraction, not percent)
        const returns =
      xs.length <= 1
          ? []
          : xs.slice(1).map((p, i) => {
              const prev = xs[i]
              return prev === 0 ? 0 : (p - prev) / prev
          })
        const volatility = returns.length ? ss.standardDeviation(returns) : 0

        // Efficiency (raw price path)
        const efficiencyRatio = this.efficiencyRatio(xs)

        // Trend regression on NORMALIZED price (% from first)
        const ysPct = xs.map((p) =>
            firstPrice === 0 ? 0 : ((p - firstPrice) / firstPrice) * 100,
        )
        const points = ysPct.map((v, i) => [i,
            v] as [number, number])
        const lr = ss.linearRegression(points) // slope is % per bar
        const predict = ss.linearRegressionLine(lr)
        const r2 = ss.rSquared(points,
            predict)

        // Peak -> now (dump) + Trough -> now (pump)
        const peakNow = this.peakToNowMetrics(sorted)
        const troughNow = this.troughToNowMetrics(sorted)

        // Shape label (still works with r2 + efficiencyRatio)
        const shapeMetrics = envConfig().inspector.priceWindow.metrics.shape
        let shape: PriceWindowShape = PriceWindowShape.Choppy

        if (r2 >= shapeMetrics.straightR2 && efficiencyRatio >= shapeMetrics.straightEfficiency) {
            shape = PriceWindowShape.Straight
        } else if (r2 >= shapeMetrics.noisyR2 || efficiencyRatio >= shapeMetrics.noisyEfficiency) {
            shape = PriceWindowShape.TrendNoisy
        }

        const twap = ss.mean(xs)
        const momentumState = this.classifyMomentumStateFromExtremes(
            peakNow,
            troughNow
        )
        return {
            // core
            twap,
            momentumState,

            // prices
            maxPrice,
            minPrice,
            diffPrice,

            // % stats
            rangePct,
            fromLowToLastPct,
            fromHighToLastPct,
            drawdownPct,

            // window trend/shape
            // IMPORTANT: slope now means "% per bar" (normalized regression)
            slope: lr.m,
            r2,
            efficiencyRatio,
            volatility,
            shape,

            // peak -> now (dump)
            peakPrice: peakNow.peakPrice,
            peakTime: peakNow.peakTime,
            peakIndex: peakNow.peakIndex,
            barsSincePeak: peakNow.barsSincePeak,
            dropFromPeakPct: peakNow.dropFromPeakPct,
            slopeFromPeakPctPerBar: peakNow.slopeFromPeakPctPerBar,
            velFromPeakPctPerMin: peakNow.velFromPeakPctPerMin,

            // trough -> now (pump)
            troughPrice: troughNow.troughPrice,
            troughTime: troughNow.troughTime,
            troughIndex: troughNow.troughIndex,
            barsSinceTrough: troughNow.barsSinceTrough,
            riseFromTroughPct: troughNow.riseFromTroughPct,
            slopeFromTroughPctPerBar: troughNow.slopeFromTroughPctPerBar,
            velFromTroughPctPerMin: troughNow.velFromTroughPctPerMin,

            // meta
            firstPrice,
            lastPrice,
            sampleCount: xs.length,
            startTime: sorted[0].time,
            endTime: sorted[sorted.length - 1].time,
        }
    }
    /**
 * Classify momentum state (Up/Down/Sideways) using:
 * - Peak -> now for dump (Down)
 * - Trough -> now for pump (Up)
 * - Otherwise Sideways
 *
 * Priority:
 * - If both pump and dump trigger (rare / choppy), prefer Sideways (or choose one by stronger magnitude).
 */
    private classifyMomentumStateFromExtremes(
        peakNow: PeakToNowMetrics,
        troughNow: TroughToNowMetrics,
    ): MomentumState {
        const cfg = envConfig().inspector.priceWindow.momentum
        // Dump from peak (negative)
        const dumpRecent = peakNow.barsSincePeak <= cfg.maxBarsSincePeak
        const dumpMagnitude = peakNow.dropFromPeakPct <= cfg.dumpFromPeakPct
        const dumpVelocity = peakNow.velFromPeakPctPerMin <= cfg.dumpVelPctPerMin
        const isDump = dumpRecent && (dumpMagnitude || dumpVelocity)
        // Pump from trough (positive)
        const pumpRecent = troughNow.barsSinceTrough <= cfg.maxBarsSinceTrough
        const pumpMagnitude = troughNow.riseFromTroughPct >= cfg.pumpFromTroughPct
        const pumpVelocity = troughNow.velFromTroughPctPerMin >= cfg.pumpVelPctPerMin
        const isPump = pumpRecent && (pumpMagnitude || pumpVelocity)
  
        // Conflict case: both signals in same window => choppy/whipsaw
        if (isDump && isPump) {
            return MomentumState.Sideways
        }
  
        if (isDump) return MomentumState.Down
        if (isPump) return MomentumState.Up
  
        return MomentumState.Sideways
    }
}