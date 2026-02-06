import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import {
    Q128,
    Q64, 
    toDecimalAmount
} from "@modules/common"
import {
    ClmmUtilsService 
} from "./clmm-utils.service"
import {
    ComputeFeeGrowthInsideParams,
    ComputeFeeEarnedParams,
    ComputeFeesParams,
    ComputeFeesResult
} from "./types"

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
     * Computes fee growth inside a position tick range.
     *
     * @param param - Parameters for computing fee growth inside
     * @returns Fee growth inside the position range
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
        // Case: current price is below the position range
        if (tickCurrent.lt(tickLower)) {
            return this.clmmUtilsService.wrapSub(
                feeGrowthOutsideLower,
                feeGrowthOutsideUpper,
                outsideDeltaWrapModulus,
            )
        }

        // Case: current price is above the position range
        if (tickCurrent.gte(tickUpper)) {
            return this.clmmUtilsService.wrapSub(
                feeGrowthOutsideUpper,
                feeGrowthOutsideLower,
                outsideDeltaWrapModulus,
            )
        }

        // Case: current price is inside the position range
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
     * Computes fee earned since last checkpoint.
     *
     * @param param - Parameters for computing fee earned
     * @returns Fee amount earned since last checkpoint
     */
    public computeFeeEarned({
        feeGrowthInside,
        feeGrowthInsideLast,
        liquidity,
        insideDeltaWrapModulus = Q128,
        resultDiv = Q64,
    }: ComputeFeeEarnedParams): BN {
        // Calculate delta growth (wrapping-safe)
        const deltaGrowth = this.clmmUtilsService.wrapSub(
            feeGrowthInside,
            feeGrowthInsideLast,
            insideDeltaWrapModulus,
        )

        // Convert growth delta to token amount
        return liquidity.mul(deltaGrowth).div(resultDiv)
    }

    /**
     * Computes total fees (token A & token B) for a CLMM position.
     *
     * @param param - Parameters for computing fees
     * @returns Total fees earned for both tokens
     */
    public computeFees({
        feeGrowthGlobalA,
        feeGrowthGlobalB,
        feeGrowthOutsideLowerA,
        feeGrowthOutsideUpperA,
        feeGrowthOutsideLowerB,
        feeGrowthOutsideUpperB,
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
        // Compute fee growth inside for token A
        const feeGrowthInsideA = this.computeFeeGrowthInside({
            feeGrowthGlobal: feeGrowthGlobalA,
            feeGrowthOutsideLower: feeGrowthOutsideLowerA,
            feeGrowthOutsideUpper: feeGrowthOutsideUpperA,
            tickCurrent,
            tickLower,
            tickUpper,
            outsideDeltaWrapModulus,
        })

        // Compute fee earned for token A
        const feeEarnedA = this.computeFeeEarned({
            feeGrowthInside: feeGrowthInsideA,
            feeGrowthInsideLast: feeGrowthInsideLastA,
            liquidity,
            insideDeltaWrapModulus,
            resultDiv,
        })

        // Compute fee growth inside for token B
        const feeGrowthInsideB = this.computeFeeGrowthInside({
            feeGrowthGlobal: feeGrowthGlobalB,
            feeGrowthOutsideLower: feeGrowthOutsideLowerB,
            feeGrowthOutsideUpper: feeGrowthOutsideUpperB,
            tickCurrent,
            tickLower,
            tickUpper,
            outsideDeltaWrapModulus,
        })

        // Compute fee earned for token B
        const feeEarnedB = this.computeFeeEarned({
            feeGrowthInside: feeGrowthInsideB,
            feeGrowthInsideLast: feeGrowthInsideLastB,
            liquidity,
            insideDeltaWrapModulus,
            resultDiv,
        })

        // Convert to decimal amounts and return
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
