import BN from "bn.js"
import {
    Q128,
    Q64,
    Q96
} from "@modules/common"

/**
 * Parameters for computing liquidity from token amounts.
 *
 * Used by `computeLiquidity` to calculate the maximum liquidity that can be
 * minted from given token amounts for a concentrated liquidity position.
 */
export interface ComputeLiquidityParams {
    /**
     * Lower tick boundary of the position (inclusive).
     *
     * This defines the lower bound of the price range for the liquidity position.
     * The tick represents a price point: price = 1.0001^tick
     */
    tickLower: BN

    /**
     * Upper tick boundary of the position (inclusive).
     *
     * This defines the upper bound of the price range for the liquidity position.
     * Must be greater than tickLower.
     * The tick represents a price point: price = 1.0001^tick
     */
    tickUpper: BN

    /**
     * Current tick of the pool.
     *
     * This represents the current price of the pool and determines which
     * token(s) contribute to the liquidity calculation:
     * - If tickCurrent <= tickLower: only token A is used
     * - If tickLower < tickCurrent < tickUpper: both tokens are used
     * - If tickCurrent >= tickUpper: only token B is used
     */
    tickCurrent: BN

    /**
     * Amount of token A available (raw BN, before decimal scaling).
     *
     * This is the raw token amount without decimal places applied.
     * For example, 1 USDC would be represented as 1_000_000 (6 decimals).
     */
    amountA: BN

    /**
     * Amount of token B available (raw BN, before decimal scaling).
     *
     * This is the raw token amount without decimal places applied.
     * For example, 1 USDC would be represented as 1_000_000 (6 decimals).
     */
    amountB: BN

    /**
     * Fixed-point precision used for sqrt prices.
     *
     * Different blockchains use different fixed-point scales:
     * - Q64 (2^64): Used by Solana/Raydium CLMM
     * - Q96 (2^96): Used by Ethereum/Uniswap V3
     * - Q128 (2^128): Extended precision option
     *
     * Defaults to Q64 if not specified.
     */
    fixedPointScale?: typeof Q64 | typeof Q96 | typeof Q128
}

/**
 * Parameters for computing token amounts from liquidity.
 *
 * Used by `computeAmountsFromLiquidity` to calculate the current token amounts
 * in a position given its liquidity value and the current pool price.
 */
export interface ComputeAmountsFromLiquidityParams {
    /**
     * The liquidity value (L) of the position.
     *
     * This is the liquidity amount that was minted or is currently in the position.
     * It's a dimensionless value that represents the "size" of the position.
     */
    liquidity: BN
    
    /**
     * Lower tick boundary of the position (inclusive).
     *
     * This defines the lower bound of the price range for the liquidity position.
     * The tick represents a price point: price = 1.0001^tick
     */
    tickLower: BN
    
    /**
     * Upper tick boundary of the position (inclusive).
     *
     * This defines the upper bound of the price range for the liquidity position.
     * Must be greater than tickLower.
     * The tick represents a price point: price = 1.0001^tick
     */
    tickUpper: BN
    
    /**
     * Current tick of the pool.
     *
     * This represents the current price of the pool and determines the distribution
     * of tokens in the position:
     * - If tickCurrent <= tickLower: position is entirely token A
     * - If tickLower < tickCurrent < tickUpper: position contains both tokens
     * - If tickCurrent >= tickUpper: position is entirely token B
     */
    tickCurrent: BN
    
    /**
     * Fixed-point precision used for sqrt prices.
     *
     * Different blockchains use different fixed-point scales:
     * - Q64 (2^64): Used by Solana/Raydium CLMM
     * - Q96 (2^96): Used by Ethereum/Uniswap V3
     * - Q128 (2^128): Extended precision option
     *
     * Defaults to Q64 if not specified.
     */
    fixedPointScale?: typeof Q64 | typeof Q96 | typeof Q128
}

/**
 * Result of computing token amounts from liquidity.
 *
 * Contains the calculated amounts of both tokens in a position based on
 * the given liquidity value and current pool price.
 */
export interface ComputeAmountsFromLiquidityResult {
    /**
     * Amount of token A in the position (raw BN, before decimal scaling).
     *
     * This is the raw token amount without decimal places applied.
     * For example, 1 USDC would be represented as 1_000_000 (6 decimals).
     *
     * Will be zero if the current price is at or above the upper bound.
     */
    amountA: BN
    
    /**
     * Amount of token B in the position (raw BN, before decimal scaling).
     *
     * This is the raw token amount without decimal places applied.
     * For example, 1 USDC would be represented as 1_000_000 (6 decimals).
     *
     * Will be zero if the current price is at or below the lower bound.
     */
    amountB: BN
}
