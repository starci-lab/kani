import Decimal from "decimal.js"
import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import {
    ClmmLiquidityFormulaService
} from "../formulas"
import {
    FindOptimalTickRangeParams,
    FindOptimalTickRangeResult,
    CandidateRangeScore
} from "./types"

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
     * 1. Calculates potential tick ranges based on current tick, spacing, and multiplier
     * 2. Evaluates liquidity and amounts for each candidate range
     * 3. Selects the range with highest utilization percentage
     * 
     * @param param - Parameters for finding optimal tick range
     * @param param.targetBalanceAmount - Amount of target token available for liquidity
     * @param param.quoteBalanceAmount - Amount of quote token available for liquidity
     * @param param.tickCurrent - Current tick of the pool
     * @param param.tickSpacing - Minimum tick spacing allowed by the pool
     * @param param.tickMultiplier - Multiplier to determine how many tick ranges to evaluate
     * @param param.targetIsA - Whether the target token is token A
     * @returns Optimal tick range with utilization score
     *
     * @example
     * const result = await service.findOptimalTickRange({ targetBalanceAmount, quoteBalanceAmount, tickCurrent, tickSpacing, tickMultiplier, targetIsA })
     */
    public async findOptimalTickRange({
        targetBalanceAmount,
        quoteBalanceAmount,
        tickCurrent,
        tickSpacing,
        tickMultiplier,
        targetIsA,
    }: FindOptimalTickRangeParams): Promise<FindOptimalTickRangeResult> {
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
                    liquidity,
                }
            )
        }
        // select the candidate range with the highest utilization score
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