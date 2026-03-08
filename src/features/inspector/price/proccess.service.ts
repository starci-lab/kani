import {
    Injectable
} from "@nestjs/common"
import {
    PriceCalculationService
} from "./calculation.service"
import {
    PricePoint,
    PrimaryInfluxdbPriceBucketService,
} from "@modules/databases"
import {
    ProccessPriceWindowParams
} from "./types"
import {
    PricePointStorageService
} from "./storage.service"
import {
    envConfig
} from "@modules/env"
import {
    LiquidityPoolExecutionScopeBuilderService
} from "./builder.service"
import {
    Interval
} from "@nestjs/schedule"
import {
    AsyncService
} from "@modules/mixin"
import {
    PrimaryInfluxdbWindowResultBucketService
} from "@modules/databases"
/**
 * Service for proccessing price window.
 */
@Injectable()
export class PriceProccessService {
    constructor(
        /** The price calculation service. */
        private readonly priceCalculationService: PriceCalculationService,
        /** The price point storage service. */
        private readonly pricePointStorageService: PricePointStorageService,
        /** The liquidity pool execution scope builder service. */
        private readonly liquidityPoolExecutionScopeBuilderService: LiquidityPoolExecutionScopeBuilderService,
        /** The async service. */
        private readonly asyncService: AsyncService,
        /** The primary influxdb window result bucket service. */
        private readonly primaryInfluxdbWindowResultBucketService: PrimaryInfluxdbWindowResultBucketService,
        /** The primary influxdb price bucket service. */
        private readonly primaryInfluxdbPriceBucketService: PrimaryInfluxdbPriceBucketService,
    ) { }

    /**
     * Handle the process interval.
     */
    @Interval(envConfig().inspector.priceWindow.proccess.intervalMs)
    async handleProcessInterval() {
        const scopes = this.liquidityPoolExecutionScopeBuilderService.executionScopesCollection.find()
        const promises: Array<Promise<void>> = []
        for (const scope of scopes) {
            promises.push(
                this.processWindow(
                    {
                        scope
                    }
                )
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }
    /**
     * Process a window.
     * @param params - The parameters for processing the window.
     * @param params.id - The ID of the token.
     * @param params.intervalMs - The interval in milliseconds.
     * @param params.marketListingId - The ID of the market listing.
     */
    private async processWindow(
        { scope }: ProccessPriceWindowParams
    ) {
        /** Get the token and market listing IDs. */
        const { token0Id, token1Id, marketListing0Id, marketListing1Id } = scope
        /** Get the price points. */
        const pricePoints0 = this.pricePointStorageService.getPricePoints(
            token0Id,
            marketListing0Id
        )
        /** Get the price points for the second token. */
        const pricePoints1 = this.pricePointStorageService.getPricePoints(
            token1Id,
            marketListing1Id
        )
        /** Check if the price points have a large gap. */
        if (
            this.primaryInfluxdbPriceBucketService.isPriceWindowContinuous(pricePoints0)
            || this.primaryInfluxdbPriceBucketService.isPriceWindowContinuous(pricePoints1)
        ) {
            return
        }
        /** Build the relative price points. */
        const relativePricePoints = this.buildRelativeSeriesInterpolated(
            pricePoints0,
            pricePoints1
        )
        /** Analyze the price window. */
        const priceWindowResult = await this.priceCalculationService.analyzePriceWindow(
            {
                pricePoints: relativePricePoints,
            }
        )
        /** If the price window result is not found, return. */
        if (!priceWindowResult) return
        /** Write the price window result. */
        await this.primaryInfluxdbWindowResultBucketService.write(
            {
                token0Id,
                token1Id,
                marketListing0Id,
                marketListing1Id,
                priceWindowResult,
            }
        )
    }

    /**
 * Build relative price series using linear interpolation on B.
 *
 * For each A(t):
 *  - Find B0.time <= t <= B1.time
 *  - Interpolate B(t)
 *  - relative(t) = A(t) / B(t)
 *
 * Returns only relative price points (no base metadata).
 * @param a - The price points for the first token.
 * @param b - The price points for the second token.
 * @returns The relative price points.
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

            const interpolatedBase =
                left.price + alpha * (right.price - left.price)

            out.push({
                ...pa,
                price: pa.price / interpolatedBase,
            })
        }

        return out
    }
}       