import { Injectable } from "@nestjs/common"
import { 
    IReservesService, 
    LiquidityPoolState, 
    ReservesParams, 
    ReservesResult 
} from "../../interfaces"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { InvalidPoolTokensException, LiquidityPoolNotFoundException } from "@exceptions"
import { ClmmTickFormulaService } from "../../formulas"
import Decimal from "decimal.js"
import BN from "bn.js"
import { computeDenomination, Q64 } from "@utils"

/**
 * Orca Reserves Service
 *
 * Implements reserve calculation for Orca CLMM (Concentrated Liquidity Market Maker) pools.
 *
 * This service calculates the token amounts (reserves) for a given liquidity position
 * based on the current pool state and position parameters.
 *
 * The calculation follows Uniswap V3-style concentrated liquidity math:
 * - Token amounts depend on the current tick relative to the position's tick range
 * - Three cases are handled:
 *   1. Current tick below range: only token A is present
 *   2. Current tick within range: both tokens A and B are present
 *   3. Current tick above range: only token B is present
 *
 * Formulas use Q64 fixed-point arithmetic for precision.
 */
@Injectable()
export class OrcaReservesService implements IReservesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly clmmTickFormulaService: ClmmTickFormulaService,
    ) {}

    /**
     * Calculate reserves (token amounts) for a liquidity position.
     *
     * @param params - Reserves calculation parameters
     * @param params.liquidityPoolId - The liquidity pool identifier
     * @param params.state - Current pool state including tick and snapshot info
     * @param params.bot - Bot configuration with active position details
     * @returns Reserves response with token A and B amounts, and snapshot timestamp
     * @throws LiquidityPoolNotFoundException if pool is not found
     * @throws InvalidPoolTokensException if pool tokens are invalid
     */
    async reserves(
        {
            liquidityPoolId,
            state,
            bot,
        }: ReservesParams): Promise<ReservesResult> {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId.toString(),
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException("Liquidity pool not found")
        }
        const _state = state as LiquidityPoolState
        const { dynamic } = _state
        const { tickCurrent } = dynamic
        const tickCurrentNumber = tickCurrent.toNumber()
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            token => token.id === _state.static.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            token => token.id === _state.static.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const sqrtPriceX64 = this.clmmTickFormulaService.tickToSqrtPriceX64({
            tickIndex: new Decimal(tickCurrentNumber),
        })
        const sqrtPriceAX64 = this.clmmTickFormulaService.tickToSqrtPriceX64({
            tickIndex: new Decimal(bot.activePosition?.tickLower ?? 0),
        })
        const sqrtPriceBX64 = this.clmmTickFormulaService.tickToSqrtPriceX64({
            tickIndex: new Decimal(bot.activePosition?.tickUpper ?? 0),
        })
        const { 
            deltaA, 
            deltaB 
        } = this.calculateLiquidityTokenDeltas(
            tickCurrentNumber,    
            sqrtPriceX64,
            bot.activePosition?.tickLower ?? 0,
            bot.activePosition?.tickUpper ?? 0,
            sqrtPriceAX64,
            sqrtPriceBX64,
            new BN(bot.activePosition?.liquidity ?? 0),
        )
        return {
            tokenA: computeDenomination(deltaA, tokenA.decimals),
            tokenB: computeDenomination(deltaB, tokenB.decimals),
            snapshotAt: state.dynamic.snapshotAt,
        }
    }

    /**
     * Calculate token deltas (amounts) for a liquidity position.
     *
     * Implements Uniswap V3-style concentrated liquidity math:
     *
     * Case 1: Current tick below position range (tickCurrent < tickLower)
     *   - Only token A is present
     *   - deltaA = liquidity × (sqrtPriceUpper - sqrtPriceLower) × Q64 / (sqrtPriceLower × sqrtPriceUpper)
     *   - deltaB = 0
     *
     * Case 2: Current tick within position range (tickLower <= tickCurrent < tickUpper)
     *   - Both tokens are present
     *   - deltaA = liquidity × (sqrtPriceUpper - sqrtPriceCurrent) × Q64 / (sqrtPriceCurrent × sqrtPriceUpper)
     *   - deltaB = liquidity × (sqrtPriceCurrent - sqrtPriceLower) / Q64
     *
     * Case 3: Current tick above position range (tickCurrent >= tickUpper)
     *   - Only token B is present
     *   - deltaA = 0
     *   - deltaB = liquidity × (sqrtPriceUpper - sqrtPriceLower) / Q64
     *
     * @param tickCurrent - Current pool tick
     * @param sqrtPriceX64 - Current sqrt price in Q64 format
     * @param tickLower - Lower tick of the position
     * @param tickUpper - Upper tick of the position
     * @param sqrtPriceLowerX64 - Sqrt price at lower tick in Q64 format
     * @param sqrtPriceUpperX64 - Sqrt price at upper tick in Q64 format
     * @param liquidityDelta - Signed liquidity amount (absolute value is used)
     * @returns Object containing deltaA and deltaB token amounts
     */
    private calculateLiquidityTokenDeltas(
        tickCurrent: number,
        sqrtPriceX64: BN,
        tickLower: number,
        tickUpper: number,
        sqrtPriceLowerX64: BN,
        sqrtPriceUpperX64: BN,
        liquidityDelta: BN, // signed
    ): { deltaA: BN; deltaB: BN } {
        const liquidity = liquidityDelta.abs()
    
        // Case 1: below range
        if (tickCurrent < tickLower) {
            const deltaA = liquidity
                .mul(sqrtPriceUpperX64.sub(sqrtPriceLowerX64))
                .mul(Q64)
                .div(sqrtPriceLowerX64.mul(sqrtPriceUpperX64))
            return { deltaA, deltaB: new BN(0) }
        }
    
        // Case 2: in range
        if (tickCurrent < tickUpper) {
            const deltaA = liquidity
                .mul(sqrtPriceUpperX64.sub(sqrtPriceX64))
                .mul(Q64)
                .div(sqrtPriceX64.mul(sqrtPriceUpperX64))
            const deltaB = liquidity
                .mul(sqrtPriceX64.sub(sqrtPriceLowerX64))
                .div(Q64)
    
            return { deltaA, deltaB }
        }
    
        // Case 3: above range
        const deltaB = liquidity
            .mul(sqrtPriceUpperX64.sub(sqrtPriceLowerX64))
            .div(Q64)
        return { deltaA: new BN(0), deltaB }
    }
}