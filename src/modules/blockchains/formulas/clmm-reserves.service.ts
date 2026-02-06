import {
    Injectable 
} from "@nestjs/common"
import Decimal from "decimal.js"
import {
    Q64,
    toDecimalAmount
} from "@modules/utils"
import {
    ClmmTickFormulaService 
} from "./clmm-tick.service"
import {
    CalculateReservesParams,
    CalculateReservesResult
} from "./types"

/**
 * CLMM Reserves Formula Service
 *
 * Computes the actual token reserves (token A & token B)
 * held by a concentrated liquidity position at the current price.
 *
 * This follows Uniswap V3 / CLMM mathematics:
 *
 * A position is defined by a price range [tickLower, tickUpper).
 * Depending on the current price (tickCurrent), liquidity is
 * represented as:
 *
 * 1) tickCurrent < tickLower
 *    → Position is inactive
 *    → 100% token A, 0% token B
 *
 * 2) tickLower ≤ tickCurrent < tickUpper
 *    → Position is active
 *    → Holds both token A and token B
 *
 * 3) tickCurrent ≥ tickUpper
 *    → Position is fully converted
 *    → 0% token A, 100% token B
 *
 * All calculations are performed using fixed-point arithmetic
 * on sqrt prices (√P), with configurable precision:
 *
 * - Q64  : common for Solana CLMM (sqrtPriceX64)
 * - Q96  : Uniswap V3 (Ethereum)
 * - Q128 : extended precision
 *
 * Final results are converted to human-readable Decimal amounts
 * using token decimals.
 */
@Injectable()
export class ClmmReservesFormulaService {
    constructor(
        private readonly clmmTickFormulaService: ClmmTickFormulaService,
    ) {}

    /**
     * Computes token A and token B reserves for a CLMM position.
     *
     * @param param - Parameters for computing reserves
     * @returns Human-readable reserves of token A and token B
     */
    public computeReserves({
        tickLower,
        tickUpper,
        tickCurrent,
        liquidity,
        fixedPointScale = Q64,
        decimalsA,
        decimalsB,
    }: CalculateReservesParams): CalculateReservesResult {
        // Convert ticks to fixed-point sqrt prices
        const sqrtPrice = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickCurrent,
            fixedPointScale,
        })

        const sqrtPriceLower = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickLower,
            fixedPointScale,
        })

        const sqrtPriceUpper = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickUpper,
            fixedPointScale,
        })

        // Case 1: Current price is below the position range (liquidity is entirely token A)
        if (tickCurrent.lt(tickLower)) {
            const tokenA = liquidity
                .mul(sqrtPriceUpper.sub(sqrtPriceLower))
                .mul(fixedPointScale)
                .div(sqrtPriceLower)
                .div(sqrtPriceUpper)

            return {
                reserveA: toDecimalAmount({
                    amount: tokenA,
                    decimals: decimalsA,
                }),
                reserveB: new Decimal(0),
            }
        }

        // Case 3: Current price is above the position range (liquidity is entirely token B)
        if (tickCurrent.gt(tickUpper)) {
            const tokenB = liquidity
                .mul(sqrtPriceUpper.sub(sqrtPriceLower))
                .div(fixedPointScale)
          
            return {
                reserveA: new Decimal(0),
                reserveB: toDecimalAmount({
                    amount: tokenB,
                    decimals: decimalsB,
                }),
            }
        }

        // Case 2: Current price is inside the position range (liquidity is split between tokens)
        const tokenA = liquidity
            .mul(sqrtPriceUpper.sub(sqrtPrice))
            .mul(fixedPointScale)
            .div(sqrtPrice)
            .div(sqrtPriceUpper)

        const tokenB = liquidity
            .mul(sqrtPrice.sub(sqrtPriceLower))
            .div(fixedPointScale)

        return {
            reserveA: toDecimalAmount({
                amount: tokenA,
                decimals: decimalsA,
            }),
            reserveB: toDecimalAmount({
                amount: tokenB,
                decimals: decimalsB,
            }),
        }
    }
}
