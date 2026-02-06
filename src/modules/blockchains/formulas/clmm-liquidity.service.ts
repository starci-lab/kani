import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import {
    Q64
} from "@modules/common"
import {
    ClmmTickFormulaService 
} from "./clmm-tick.service"
import {
    ComputeLiquidityParams,
    ComputeAmountsFromLiquidityParams,
    ComputeAmountsFromLiquidityResult
} from "./types"
/**
 * CLMM Liquidity Formula Service
 *
 * Computes the maximum liquidity (L) that can be minted
 * from given token amounts (amountA, amountB) for a
 * concentrated liquidity position.
 *
 * This strictly follows Uniswap V3 / Raydium CLMM math.
 *
 * Liquidity behavior:
 *
 * 1) tickCurrent <= tickLower
 *    → only token A is used
 *
 * 2) tickLower < tickCurrent < tickUpper
 *    → both token A and B are used
 *    → liquidity = min(LA, LB)
 *
 * 3) tickCurrent >= tickUpper
 *    → only token B is used
 *
 * All math is done using BN fixed-point arithmetic.
 */
@Injectable()
export class ClmmLiquidityFormulaService {
    /**
     * Creates an instance of ClmmLiquidityFormulaService.
     *
     * @param clmmTickFormulaService - Service for converting between ticks and sqrt prices
     */
    constructor(
        private readonly clmmTickFormulaService: ClmmTickFormulaService,
    ) {}

    /**
     * Computes the maximum liquidity (L) that can be minted from given token amounts
     * for a concentrated liquidity position within a tick range.
     *
     * The computation depends on where the current price (tickCurrent) lies relative
     * to the position range [tickLower, tickUpper]:
     *
     * - If tickCurrent <= tickLower: Only token A contributes to liquidity
     * - If tickLower < tickCurrent < tickUpper: Both tokens contribute, liquidity is min(LA, LB)
     * - If tickCurrent >= tickUpper: Only token B contributes to liquidity
     *
     * @param params - Parameters for liquidity computation
     * @param params.tickLower - Lower tick boundary of the position (inclusive)
     * @param params.tickUpper - Upper tick boundary of the position (inclusive)
     * @param params.tickCurrent - Current tick of the pool
     * @param params.amountA - Amount of token A available (raw BN, before decimal scaling)
     * @param params.amountB - Amount of token B available (raw BN, before decimal scaling)
     * @param params.fixedPointScale - Fixed-point precision for sqrt prices (default: Q64)
     *                                 Q64 = 2^64 (Solana/Raydium), Q96 = 2^96 (Ethereum/Uniswap V3)
     *
     * @returns The maximum liquidity (L) that can be minted from the given amounts
     *
     * @example
     * ```typescript
     * const liquidity = service.computeLiquidity({
     *   tickLower: new BN(-100),
     *   tickUpper: new BN(100),
     *   tickCurrent: new BN(0),
     *   amountA: new BN(1000000),
     *   amountB: new BN(2000000),
     *   fixedPointScale: Q64
     * });
     * ```
     */
    public computeLiquidity({
        tickLower,
        tickUpper,
        tickCurrent,
        amountA,
        amountB,
        fixedPointScale = Q64,
    }: ComputeLiquidityParams): BN {
        // Step 1: Convert tick indices to sqrt prices (fixed-point representation)
        const sqrtPriceLower = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickLower,
            fixedPointScale,
        })

        const sqrtPriceUpper = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickUpper,
            fixedPointScale,
        })

        const sqrtPriceCurrent = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickCurrent,
            fixedPointScale,
        })

        // Case 1: Current price is below or equal to the lower bound (only token A)
        if (tickCurrent.lte(tickLower)) {
            return this.getLiquidityFromAmountA(
                amountA,
                sqrtPriceLower,
                sqrtPriceUpper,
                fixedPointScale,
            )
        }
        
        // Case 3: Current price is above or equal to the upper bound (only token B)
        if (tickCurrent.gte(tickUpper)) {
            return this.getLiquidityFromAmountB(
                amountB,
                sqrtPriceLower,
                sqrtPriceUpper,
                fixedPointScale,
            )
        }
        
        // Case 2: Current price is inside the position range (both tokens)
        const liquidityFromA = this.getLiquidityFromAmountA(
            amountA,
            sqrtPriceCurrent,  // Use current price as lower bound for token A calculation
            sqrtPriceUpper,
            fixedPointScale,
        )
        const liquidityFromB = this.getLiquidityFromAmountB(
            amountB,
            sqrtPriceLower,
            sqrtPriceCurrent,  // Use current price as upper bound for token B calculation
            fixedPointScale,
        )
        
        // Return the minimum to ensure both token amounts are sufficient
        return liquidityFromA.lt(liquidityFromB)
            ? liquidityFromA
            : liquidityFromB
    }

    /* ------------------------------------------------------------------ */
    /*                           Internal math                             */
    /* ------------------------------------------------------------------ */

    /**
     * Computes liquidity (L) from the amount of token A.
     *
     * Formula derivation:
     * 
     * In a CLMM position, the amount of token A in a range [P_lower, P_upper] is:
     * amountA = L * (1/√P_lower - 1/√P_upper)
     * 
     * Solving for L:
     * L = amountA / (1/√P_lower - 1/√P_upper)
     *   = amountA / ((√P_upper - √P_lower) / (√P_lower * √P_upper))
     *   = amountA * √P_lower * √P_upper / (√P_upper - √P_lower)
     * 
     * Since sqrt prices are in fixed-point (multiplied by fixedPointScale),
     * we need to divide by fixedPointScale to get the final liquidity value.
     *
     * @param amountA - Amount of token A (raw BN, before decimal scaling)
     * @param sqrtPriceLower - Square root of lower price (fixed-point, scaled by fixedPointScale)
     * @param sqrtPriceUpper - Square root of upper price (fixed-point, scaled by fixedPointScale)
     * @param fixedPointScale - Fixed-point precision scale (Q64, Q96, or Q128)
     *
     * @returns Liquidity value computed from token A amount
     *
     * Formula:
     * ```
     * L = amountA * sqrt(P_lower) * sqrt(P_upper)
     *     ---------------------------------------
     *           sqrt(P_upper) - sqrt(P_lower)
     * ```
     */
    private getLiquidityFromAmountA(
        amountA: BN,
        sqrtPriceLower: BN,
        sqrtPriceUpper: BN,
        fixedPointScale: BN,
    ): BN {
        // Compute numerator: amountA * √P_lower * √P_upper
        // Then divide by denominator: (√P_upper - √P_lower)
        // Finally divide by fixedPointScale to account for fixed-point representation
        return amountA
            .mul(sqrtPriceLower)
            .mul(sqrtPriceUpper)
            .div(sqrtPriceUpper.sub(sqrtPriceLower))
            .div(fixedPointScale)
    }

    /**
     * Computes liquidity (L) from the amount of token B.
     *
     * Formula derivation:
     * 
     * In a CLMM position, the amount of token B in a range [P_lower, P_upper] is:
     * amountB = L * (√P_upper - √P_lower)
     * 
     * Solving for L:
     * L = amountB / (√P_upper - √P_lower)
     * 
     * Since sqrt prices are in fixed-point (multiplied by fixedPointScale),
     * we need to multiply amountB by fixedPointScale to maintain proper scaling.
     *
     * @param amountB - Amount of token B (raw BN, before decimal scaling)
     * @param sqrtPriceLower - Square root of lower price (fixed-point, scaled by fixedPointScale)
     * @param sqrtPriceUpper - Square root of upper price (fixed-point, scaled by fixedPointScale)
     * @param fixedPointScale - Fixed-point precision scale (Q64, Q96, or Q128)
     *
     * @returns Liquidity value computed from token B amount
     *
     * Formula:
     * ```
     * L = amountB * fixedPointScale
     *     -----------------------------
     *     sqrt(P_upper) - sqrt(P_lower)
     * ```
     */
    private getLiquidityFromAmountB(
        amountB: BN,
        sqrtPriceLower: BN,
        sqrtPriceUpper: BN,
        fixedPointScale: BN,
    ): BN {
        // Multiply amountB by fixedPointScale to account for fixed-point sqrt prices
        // Then divide by the price range difference
        return amountB
            .mul(fixedPointScale)
            .div(sqrtPriceUpper.sub(sqrtPriceLower))
    }

    /**
     * Computes the token amounts (amountA, amountB) from a given liquidity value
     * for a concentrated liquidity position.
     *
     * This is the inverse operation of `computeLiquidity`. Given a liquidity value L
     * and a position range [tickLower, tickUpper], it calculates how much of each
     * token is currently in the position based on the current price.
     *
     * The computation depends on where the current price (tickCurrent) lies relative
     * to the position range:
     *
     * - If tickCurrent <= tickLower: Position is entirely token A, amountB = 0
     * - If tickLower < tickCurrent < tickUpper: Position contains both tokens
     * - If tickCurrent >= tickUpper: Position is entirely token B, amountA = 0
     *
     * @param params - Parameters for amount computation
     * @param params.liquidity - The liquidity value (L) of the position
     * @param params.tickLower - Lower tick boundary of the position (inclusive)
     * @param params.tickUpper - Upper tick boundary of the position (inclusive)
     * @param params.tickCurrent - Current tick of the pool
     * @param params.fixedPointScale - Fixed-point precision for sqrt prices (default: Q64)
     *                                 Q64 = 2^64 (Solana/Raydium), Q96 = 2^96 (Ethereum/Uniswap V3)
     *
     * @returns Object containing amountA and amountB (raw BN values, before decimal scaling)
     *
     * @example
     * ```typescript
     * const { amountA, amountB } = service.computeAmountsFromLiquidity({
     *   liquidity: new BN(1000000),
     *   tickLower: new BN(-100),
     *   tickUpper: new BN(100),
     *   tickCurrent: new BN(0),
     *   fixedPointScale: Q64
     * });
     * ```
     */
    public computeAmountsFromLiquidity(
        {
            tickLower,
            tickUpper,
            tickCurrent,
            liquidity,
            fixedPointScale = Q64, // Default: 2^64 for Solana/Raydium
        }: ComputeAmountsFromLiquidityParams
    ): ComputeAmountsFromLiquidityResult {
        /**
         * Step 1: Convert tick indices to sqrt prices (fixed-point representation)
         * 
         * These sqrt prices are used in all subsequent calculations to determine
         * the token amounts based on the current price position.
         */
        const sqrtPriceLower = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickLower,
            fixedPointScale,
        })
    
        const sqrtPriceUpper = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickUpper,
            fixedPointScale,
        })
    
        const sqrtPriceCurrent = this.clmmTickFormulaService.tickToSqrtPrice({
            tickIndex: tickCurrent,
            fixedPointScale,
        })
    
        // Initialize amounts to zero
        let amountA = new BN(0)
        let amountB = new BN(0)
    
        /**
         * Case 1: Current price is below or equal to the lower bound (Pc ≤ Pl)
         * 
         * When the current price is below the position range, the entire position
         * consists of token A. All token B has been swapped for token A.
         * 
         * Formula: amountA = L * (1/√Pl - 1/√Pu)
         *                  = L * (√Pu - √Pl) / (√Pl * √Pu)
         * 
         * We multiply by fixedPointScale to account for the fixed-point representation
         * of sqrt prices, then divide by both sqrt prices.
         */
        if (sqrtPriceCurrent.lte(sqrtPriceLower)) {
            // Compute amountA using the full range [tickLower, tickUpper]
            amountA = liquidity
                .mul(sqrtPriceUpper.sub(sqrtPriceLower))  // L * (√Pu - √Pl)
                .mul(fixedPointScale)                      // Scale for fixed-point
                .div(sqrtPriceLower)                       // Divide by √Pl
                .div(sqrtPriceUpper)                        // Divide by √Pu
    
            // No token B when price is below range
            amountB = new BN(0)
        }
    
        /**
         * Case 2: Current price is above or equal to the upper bound (Pc ≥ Pu)
         * 
         * When the current price is above the position range, the entire position
         * consists of token B. All token A has been swapped for token B.
         * 
         * Formula: amountB = L * (√Pu - √Pl)
         * 
         * We divide by fixedPointScale because sqrt prices are in fixed-point,
         * and we need to convert back to the raw token amount.
         */
        else if (sqrtPriceCurrent.gte(sqrtPriceUpper)) {
            // No token A when price is above range
            amountA = new BN(0)
    
            // Compute amountB using the full range [tickLower, tickUpper]
            amountB = liquidity
                .mul(sqrtPriceUpper.sub(sqrtPriceLower))  // L * (√Pu - √Pl)
                .div(fixedPointScale)                      // Convert from fixed-point
        }
    
        /**
         * Case 3: Current price is inside the position range (Pl < Pc < Pu)
         * 
         * When the current price is within the position range, the position contains
         * both tokens. The amounts are computed based on the current price:
         * 
         * - Token A: in the range [tickCurrent, tickUpper]
         *   Formula: amountA = L * (1/√Pc - 1/√Pu)
         *                    = L * (√Pu - √Pc) / (√Pc * √Pu)
         * 
         * - Token B: in the range [tickLower, tickCurrent]
         *   Formula: amountB = L * (√Pc - √Pl)
         */
        else {
            // Compute amountA for the range [tickCurrent, tickUpper]
            // This represents the token A portion of the position
            amountA = liquidity
                .mul(sqrtPriceUpper.sub(sqrtPriceCurrent))  // L * (√Pu - √Pc)
                .mul(fixedPointScale)                        // Scale for fixed-point
                .div(sqrtPriceCurrent)                       // Divide by √Pc
                .div(sqrtPriceUpper)                         // Divide by √Pu
    
            // Compute amountB for the range [tickLower, tickCurrent]
            // This represents the token B portion of the position
            amountB = liquidity
                .mul(sqrtPriceCurrent.sub(sqrtPriceLower))  // L * (√Pc - √Pl)
                .div(fixedPointScale)                        // Convert from fixed-point
        }
    
        return {
            amountA,
            amountB,
        }
    }
}