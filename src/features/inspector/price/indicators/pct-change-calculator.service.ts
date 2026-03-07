import {
    Injectable 
} from "@nestjs/common"
import {
    CalculatePctChangeParams,
    CalculateResult,
} from "../types"

/**
 * Service for calculating percentage change between two prices.
 */
@Injectable()
export class PctChangeCalculatorService {
    /**
     * Calculates the percentage change from previous price to current price.
     *
     * @param param - Parameters containing previous and current prices
     * @returns Percentage change value
     *
     * @example
     * const change = calculator.calculate({ previousPrice: 100, currentPrice: 110 })
     * // Returns: 10 (10% increase)
     */
    calculate(
        { 
            pricePoints, 
            threshold 
        }: CalculatePctChangeParams
    ): CalculateResult {
        if (pricePoints.length < 2) {
            return {
                shouldExit: false,
            }
        }
        const previousPrice = pricePoints.at(0)?.price
        const currentPrice = pricePoints.at(-1)?.price
        if (
            currentPrice 
            && previousPrice 
            && currentPrice - previousPrice > threshold
        ) {
            return {
                shouldExit: true,
            }
        }
        return {
            shouldExit: false,
        }
    }
}
