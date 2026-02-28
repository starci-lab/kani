import {
    Injectable 
} from "@nestjs/common"
import {
    PrimaryInfluxdbPriceBucketService 
} from "@modules/databases"
import {
    envConfig 
} from "@modules/env"
import type {
    AnalyzePriceWindowParams, 
    PeakToNowMetrics, 
    PriceWindowResult 
} from "./types"
import {
    PriceWindowShape 
} from "./types"
import ss from "simple-statistics"
import {
    PricePoint 
} from "@modules/databases"

/**
 * Service for computing price window stats (min/max/range/drawdown/trend)
 * + peak->now dump/reversal metrics.
 */
@Injectable()
export class PriceCalculationService {
    constructor(
    private readonly primaryInfluxdbPriceBucketService: PrimaryInfluxdbPriceBucketService,
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
   * Compute peak->now metrics (for dump/reversal detection).
   */
    private peakToNowMetrics(sorted: Array<PricePoint>): PeakToNowMetrics {
        const xs = sorted.map((p) => p.price)
        const ts = sorted.map((p) => new Date(p.time).getTime())

        const peakPrice = ss.max(xs)
        const peakIndex = xs.indexOf(peakPrice)

        const lastIndex = xs.length - 1
        const lastPrice = xs[lastIndex]

        const dropFromPeakPct =
      peakPrice === 0 ? 0 : ((lastPrice - peakPrice) / peakPrice) * 100 // negative when below peak

        const barsSincePeak = lastIndex - peakIndex
        const dtMs = ts[lastIndex] - ts[peakIndex]
        const dtMin = dtMs / 60000

        const slopeFromPeakPctPerBar =
      barsSincePeak > 0 ? dropFromPeakPct / barsSincePeak : 0

        const velFromPeakPctPerMin =
      dtMin > 0 ? dropFromPeakPct / dtMin : 0

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
   * Compute TWAP + window math stats.
   * NOTE: TWAP here is simple mean of samples.
   */
    async analyzePriceWindow(
        { id, intervalMs, marketListingId }: AnalyzePriceWindowParams,
    ): Promise<PriceWindowResult | null> {
        const prices = await this.primaryInfluxdbPriceBucketService.queryPromise({
            id,
            intervalMs,
            marketListingId,
        })

        if (prices.length === 0) return null

        // Ensure time ordering so "last" is meaningful
        const sorted = [...prices].sort(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
        )
        // get the prices
        const xs = sorted.map((p) => p.price)
        const firstPrice = xs[0]
        const lastPrice = xs[xs.length - 1]

        // get the max and min prices
        const maxPrice = ss.max(xs)
        const minPrice = ss.min(xs)
        const diffPrice = maxPrice - minPrice

        // % stats
        // get the range percentage
        const rangePct = minPrice === 0 ? 0 : ((maxPrice - minPrice) / minPrice) * 100
        const fromLowToLastPct = minPrice === 0 ? 0 : ((lastPrice - minPrice) / minPrice) * 100
        const fromHighToLastPct = maxPrice === 0 ? 0 : ((lastPrice - maxPrice) / maxPrice) * 100 // usually negative if below high
        // get the drawdown percentage
        const drawdownPct = this.maxDrawdownPct(xs)

        // Volatility on returns
        const returns =
      xs.length <= 1
          ? []
          : xs.slice(1).map((p, i) => {
              const prev = xs[i]
              return prev === 0 ? 0 : (p - prev) / prev
          })
        const volatility = returns.length ? ss.standardDeviation(returns) : 0

        // Trend straightness: regression slope + r2 (window-level)
        const points = xs.map((price, i) => [i,
            price] as [number, number])
        const lr = ss.linearRegression(points)
        const predict = ss.linearRegressionLine(lr)
        const r2 = ss.rSquared(points,
            predict)
        const efficiencyRatio = this.efficiencyRatio(xs)

        // Peak -> now metrics (dump/reversal focused)
        const peakNow = this.peakToNowMetrics(sorted)

        // Shape label using BOTH window context and peak->now drop
        const shapeMetrics = envConfig().inspector.priceWindow.metrics.shape
        
        let shape: PriceWindowShape = PriceWindowShape.Choppy

        // Strong straight trend
        if (r2 >= shapeMetrics.straightR2 && efficiencyRatio >= shapeMetrics.straightEfficiency) {
            shape = PriceWindowShape.Straight
        } else if (r2 >= shapeMetrics.noisyR2 || efficiencyRatio >= shapeMetrics.noisyEfficiency) {
            shape = PriceWindowShape.TrendNoisy
        }

        // Optional: if price is dumping hard from peak, force choppy (or add a new enum like Dumping)
        // Example: drop >= 5% quickly after peak
        // if (peakNow.dropFromPeakPct <= -5 && peakNow.barsSincePeak <= 30) shape = PriceWindowShape.Choppy
        const twap = ss.mean(xs)

        return {
            // core
            twap,

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
            slope: lr.m,
            r2,
            efficiencyRatio,
            volatility,
            shape,

            // peak -> now (NEW)
            peakPrice: peakNow.peakPrice,
            peakTime: peakNow.peakTime,
            peakIndex: peakNow.peakIndex,
            barsSincePeak: peakNow.barsSincePeak,
            dropFromPeakPct: peakNow.dropFromPeakPct,
            slopeFromPeakPctPerBar: peakNow.slopeFromPeakPctPerBar,
            velFromPeakPctPerMin: peakNow.velFromPeakPctPerMin,

            // meta
            firstPrice,
            lastPrice,
            sampleCount: xs.length,
            startTime: sorted[0].time,
            endTime: sorted[sorted.length - 1].time,
        }
    }
}