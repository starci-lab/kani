import Decimal from "decimal.js"
import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import {
    ClmmLiquidityFormulaService
} from "../formulas"

/**
 * Service for calculating optimal tick ranges in Concentrated Liquidity Market Maker (CLMM) pools.
 * Handles tick range optimization based on token balances and current pool state.
 */
@Injectable()
export class TickMathService {
    constructor(
        private readonly clmmLiquidityFormulaService: ClmmLiquidityFormulaService,
    ) {}

    /**
     * Finds the optimal tick range for providing liquidity in a CLMM pool.
     * 
     * This method:
     * 1. Resolves the relative price between target and quote tokens
     * 2. Calculates potential tick ranges based on current tick, spacing, and multiplier
     * 3. Evaluates liquidity and amounts for each candidate range
     * 
     * @param params - Parameters for finding optimal tick range
     * @param params.targetBalanceAmount - Amount of target token available for liquidity
     * @param params.quoteBalanceAmount - Amount of quote token available for liquidity
     * @param params.targetToken - The target token schema
     * @param params.quoteToken - The quote token schema
     * @param params.tickCurrent - Current tick of the pool
     * @param params.tickSpacing - Minimum tick spacing allowed by the pool
     * @param params.tickMultiplier - Multiplier to determine how many tick ranges to evaluate
     * @returns Promise resolving to the optimal tick range (currently returns placeholder values)
     * @throws CacheStaleException if the price data is stale
     */
    public async findOptimalTickRange(
        {
            targetBalanceAmount,
            quoteBalanceAmount,
            tickCurrent,
            tickSpacing,
            tickMultiplier,
            targetIsA,
        }: FindOptimalTickRangeParams
    ): Promise<FindOptimalTickRangeResult> {
        const _amountA = targetIsA ? targetBalanceAmount : quoteBalanceAmount
        const _amountB = targetIsA ? quoteBalanceAmount : targetBalanceAmount
        // Calculate the tick range width (span) based on spacing and multiplier
        // tickSpan = tickSpacing * tickMultiplier
        const tickSpan = new Decimal(tickSpacing.toString()).mul(new Decimal(tickMultiplier.toString()))
        
        // Calculate the initial lower tick bound
        // This rounds the current tick up to the nearest valid tick (based on spacing),
        // then subtracts the tick span to position the range below the current price
        const initialTickLower = new Decimal(tickCurrent.toString()).div(tickSpacing).ceil().mul(tickSpacing).sub(tickSpan)
        
        const candidateRanges: Array<CandidateRangeScore> = []
        // Iterate through multiple tick range candidates
        // Each iteration shifts the range by one tick spacing unit
        for (let i = 0; i < tickMultiplier.toNumber(); i++) {
            // Calculate the lower tick for this candidate range
            // Shift the initial lower tick by i * tickSpacing
            const tickLower = initialTickLower.add(new Decimal(tickSpacing.toString()).mul(new Decimal(i.toString())))
            
            // Calculate the upper tick by adding the tick span to the lower tick
            const tickUpper = tickLower.add(tickSpan)
            
            // Compute the liquidity that would be provided with the given amounts in this range
            const liquidity = this.clmmLiquidityFormulaService.computeLiquidity(
                {
                    tickLower: new BN(tickLower.toString()),
                    tickUpper: new BN(tickUpper.toString()),
                    tickCurrent: tickCurrent,
                    amountA: _amountA,
                    amountB: _amountB,
                }
            )
            
            // Reverse calculate: given the computed liquidity, what amounts would actually be used?
            // This helps verify that the range efficiently utilizes the provided token amounts
            const { 
                amountA, 
                amountB 
            } = this.clmmLiquidityFormulaService.computeAmountsFromLiquidity(
                {
                    liquidity,
                    tickLower: new BN(tickLower.toString()),
                    tickUpper: new BN(tickUpper.toString()),
                    tickCurrent: tickCurrent,
                }
            )
            // calculate the percentage of the target and quote tokens that are used
            const usedAPercent = new Decimal(amountA.toString())
                .div(_amountA.toString())
            const usedBPercent = new Decimal(amountB.toString())
                .div(_amountB.toString())
            // bottleneck principle: the score is the minimum of the used percentages
            const utilizationPercentage = Decimal.min(
                usedAPercent,
                usedBPercent
            )
            // add the candidate range to the list
            candidateRanges.push(
                {
                    tickLower: new BN(tickLower.toString()),
                    tickUpper: new BN(tickUpper.toString()),
                    utilizationPercentage,
                    amountA: new BN(amountA.toString()),
                    amountB: new BN(amountB.toString()),
                }
            )
        }
        // select the candidate range with the highest score
        return candidateRanges.sort(
            (
                candidateRangeA, 
                candidateRangeB
            ) => candidateRangeB
                .utilizationPercentage
                .sub(candidateRangeA.utilizationPercentage)
                .toNumber())[0]
    }
}

/**
 * Parameters for finding the optimal tick range for liquidity provision.
 */
export interface FindOptimalTickRangeParams {
    /** Amount of target token available to provide as liquidity */
    targetBalanceAmount: BN
    /** Amount of quote token available to provide as liquidity */
    quoteBalanceAmount: BN
    /** Current tick index of the pool */
    tickCurrent: BN
    /** Minimum tick spacing allowed by the pool (determines valid tick positions) */
    tickSpacing: Decimal
    /** Multiplier used to determine the number of tick range candidates to evaluate */
    tickMultiplier: Decimal
    /** Whether the target token is token A */
    targetIsA: boolean
}

/**
 * Result containing the optimal tick range bounds.
 */
export interface FindOptimalTickRangeResult {
    /** Lower bound of the optimal tick range */
    tickLower: BN
    /** Upper bound of the optimal tick range */
    tickUpper: BN
    /** Score of the optimal tick range */
    utilizationPercentage: Decimal
    /** Amount of target token used */
    amountA: BN
    /** Amount of quote token used */
    amountB: BN
}   

export interface CandidateRangeScore {
    tickLower: BN
    tickUpper: BN
    utilizationPercentage: Decimal
    amountA: BN
    amountB: BN
}