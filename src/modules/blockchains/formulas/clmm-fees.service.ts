import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    Q128, Q64, 
    toDecimalAmount
} from "@modules/utils"
import {
    ClmmUtilsService 
} from "./clmm-utils.service"

/**
 * CLMM Fee Formula Service
 *
 * Implements Uniswap V3-style fee math for concentrated liquidity positions.
 *
 * All fee growth values are assumed to be:
 * - wrapped u128
 * - fixed-point (usually Q64.64)
 */
@Injectable()
export class ClmmFeesFormulaService {
    constructor(
        private readonly clmmUtilsService: ClmmUtilsService,
    ) {}

    /**
     * Compute fee growth inside a position tick range.
     */
    public computeFeeGrowthInside({
        feeGrowthGlobal,
        feeGrowthOutsideLower,
        feeGrowthOutsideUpper,
        tickCurrent,
        tickLower,
        tickUpper,
        outsideDeltaWrapModulus = Q128,
    }: ComputeFeeGrowthInsideParams): BN {
        if (tickCurrent.lt(tickLower)) {
            return this.clmmUtilsService.wrapSub(
                feeGrowthOutsideLower,
                feeGrowthOutsideUpper,
                outsideDeltaWrapModulus,
            )
        }

        if (tickCurrent.gte(tickUpper)) {
            return this.clmmUtilsService.wrapSub(
                feeGrowthOutsideUpper,
                feeGrowthOutsideLower,
                outsideDeltaWrapModulus,
            )
        }

        return this.clmmUtilsService.wrapSub(
            this.clmmUtilsService.wrapSub(
                feeGrowthGlobal,
                feeGrowthOutsideLower,
                outsideDeltaWrapModulus,
            ),
            feeGrowthOutsideUpper,
            outsideDeltaWrapModulus,
        )
    }

    /**
     * Compute fee earned since last checkpoint.
     */
    public computeFeeEarned({
        feeGrowthInside,
        feeGrowthInsideLast,
        liquidity,
        insideDeltaWrapModulus = Q128,
        resultDiv = Q64,
    }: ComputeFeeEarnedParams): BN {
        const deltaGrowth = this.clmmUtilsService.wrapSub(
            feeGrowthInside,
            feeGrowthInsideLast,
            insideDeltaWrapModulus,
        )

        return liquidity.mul(deltaGrowth).div(resultDiv)
    }

    /**
     * Compute total fees (token A & token B) for a CLMM position.
     */
    public computeFees({
        feeGrowthGlobal,
        feeGrowthOutsideLower,
        feeGrowthOutsideUpper,
        tickCurrent,
        tickLower,
        tickUpper,
        feeGrowthInsideLastA,
        feeGrowthInsideLastB,
        liquidity,
        feeOwnedA = new BN(0),
        feeOwnedB = new BN(0),
        decimalsA,
        decimalsB,
        outsideDeltaWrapModulus = Q128,
        insideDeltaWrapModulus = Q128,
        resultDiv = Q64,
    }: ComputeFeesParams): ComputeFeesResult {
        // -------- Token A --------
        const feeGrowthInsideA = this.computeFeeGrowthInside({
            feeGrowthGlobal,
            feeGrowthOutsideLower,
            feeGrowthOutsideUpper,
            tickCurrent,
            tickLower,
            tickUpper,
            outsideDeltaWrapModulus,
        })

        const feeEarnedA = this.computeFeeEarned({
            feeGrowthInside: feeGrowthInsideA,
            feeGrowthInsideLast: feeGrowthInsideLastA,
            liquidity,
            insideDeltaWrapModulus,
            resultDiv,
        })

        // -------- Token B --------
        const feeGrowthInsideB = this.computeFeeGrowthInside({
            feeGrowthGlobal,
            feeGrowthOutsideLower,
            feeGrowthOutsideUpper,
            tickCurrent,
            tickLower,
            tickUpper,
            outsideDeltaWrapModulus,
        })

        const feeEarnedB = this.computeFeeEarned({
            feeGrowthInside: feeGrowthInsideB,
            feeGrowthInsideLast: feeGrowthInsideLastB,
            liquidity,
            insideDeltaWrapModulus,
            resultDiv,
        })

        return {
            feeA: toDecimalAmount({
                amount: feeOwnedA.add(feeEarnedA),
                decimals: decimalsA,
            }),
            feeB: toDecimalAmount({
                amount: feeOwnedB.add(feeEarnedB),
                decimals: decimalsB,
            }),
        }
    }
}

export interface ComputeFeesParams {
    /**
     * Global fee growth accumulator of the pool (for a specific token).
     *
     * Monotonically increasing value tracking total fees per unit liquidity,
     * represented in fixed-point (usually Q64.64) and wrapped in u128.
     */
    feeGrowthGlobal: BN

    /**
     * Fee growth outside the lower tick boundary.
     *
     * Used to exclude fee growth that occurred below the position range.
     * Stored as wrapped u128.
     */
    feeGrowthOutsideLower: BN

    /**
     * Fee growth outside the upper tick boundary.
     *
     * Used to exclude fee growth that occurred above the position range.
     * Stored as wrapped u128.
     */
    feeGrowthOutsideUpper: BN

    /**
     * Current pool tick (current market price).
     *
     * Determines whether the position is below, inside, or above its range.
     */
    tickCurrent: BN

    /**
     * Lower tick boundary of the liquidity position.
     */
    tickLower: BN

    /**
     * Upper tick boundary of the liquidity position.
     */
    tickUpper: BN

    /**
     * Fee growth inside the position range at the last checkpoint (token A).
     *
     * Used to compute incremental fees earned since the last update.
     * Stored as wrapped u128.
     */
    feeGrowthInsideLastA: BN

    /**
     * Fee growth inside the position range at the last checkpoint (token B).
     *
     * Used to compute incremental fees earned since the last update.
     * Stored as wrapped u128.
     */
    feeGrowthInsideLastB: BN

    /**
     * Liquidity amount of the position (L).
     *
     * This is an unsigned integer representing liquidity units,
     * not a token amount.
     */
    liquidity: BN

    /**
     * Fees already owned by the position for token A.
     *
     * These are fees that have been previously accrued and stored
     * on the position account.
     */
    feeOwnedA?: BN

    /**
     * Fees already owned by the position for token B.
     *
     * These are fees that have been previously accrued and stored
     * on the position account.
     */
    feeOwnedB?: BN

    /**
     * Wrapping modulus used when computing fee growth deltas.
     *
     * Defaults to Q128 to match u128 wrapping behavior
     * used by most CLMM implementations.
     */
    outsideDeltaWrapModulus?: typeof Q128 | typeof Q64

    /**
     * Wrapping modulus used when computing delta growth
     * between two fee growth checkpoints.
     *
     * Defaults to Q128 (u128 wrapping).
     */
    insideDeltaWrapModulus?: typeof Q128 | typeof Q64

    /**
     * Divisor applied when converting fee growth into
     * actual token amounts.
     *
     * Commonly Q64 for Q64.64 fixed-point fee growth values.
     */
    resultDiv?: typeof Q64 | typeof Q128

    /**
     * Decimals of token A.
     */
    decimalsA: Decimal

    /**
     * Decimals of token B.
     */
    decimalsB: Decimal
}

export interface ComputeFeesResult {
    /**
     * Fees earned for token A.
     */
    feeA: Decimal
    /**
     * Fees earned for token B.
     */
    feeB: Decimal
}


export interface ComputeFeeGrowthInsideParams { 
    feeGrowthGlobal: BN
    feeGrowthOutsideLower: BN
    feeGrowthOutsideUpper: BN
    tickCurrent: BN
    tickLower: BN
    tickUpper: BN
    outsideDeltaWrapModulus?: typeof Q128 | typeof Q64
}

export interface ComputeFeeEarnedParams {
    feeGrowthInside: BN
    feeGrowthInsideLast: BN
    liquidity: BN
    insideDeltaWrapModulus?: typeof Q128 | typeof Q64
    resultDiv?: typeof Q64 | typeof Q128
}