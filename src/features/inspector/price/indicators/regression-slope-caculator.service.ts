import {
    Injectable,
} from "@nestjs/common"
import ss from "simple-statistics"
import {
    CalculateRegressionSlopeParams,
    CalculateResult,
} from "../types"

@Injectable()
export class RegressionSlopeCalculatorService {
    calculate({
        pricePoints,
        threshold,
        r2Threshold,
    }: CalculateRegressionSlopeParams): CalculateResult {

        if (pricePoints.length < 2) {
            return { shouldExit: false }
        }

        const prices = pricePoints.map(pricePoint => pricePoint.price)

        const firstPrice = pricePoints.at(0)?.price ?? 0
        const lastPrice = pricePoints.at(-1)?.price ?? 0

        if (firstPrice <= 0) {
            return { shouldExit: false }
        }

        /**
         * 1️⃣ Total % change over the window
         */
        const windowReturn = (lastPrice / firstPrice) - 1

        /**
         * 2️⃣ Normalize prices for regression
         */
        const normalized = prices.map(p => (p / firstPrice) - 1)

        const points = normalized.map((p, i) => [i, p] as [number, number])

        /**
         * 3️⃣ Linear regression
         */
        const lr = ss.linearRegression(points)

        /**
         * 4️⃣ Calculate R² (trend quality)
         */
        const r2 = ss.rSquared(points, x => lr.m * x + lr.b)

        /**
         * 5️⃣ Exit condition
         */
        if (
            windowReturn <= threshold &&
            lr.m < 0 &&
            r2 >= r2Threshold
        ) {
            return { shouldExit: true }
        }

        return { shouldExit: false }
    }
}