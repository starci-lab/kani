import {
    LiquidityPoolState 
} from "@modules/blockchains"
import {
    LiquidityPoolSchema
} from "@modules/databases"

/**
 * Parameters for loading the liquidity pool context.
 */
export interface LoadLiquidityPoolContextParams {
    /** Liquidity pool ID. */
    liquidityPoolId: string
}

/**
 * Result of loading the liquidity pool context.
 */
export interface LoadLiquidityPoolContextResult {
    /** Liquidity pool. */
    liquidityPool: LiquidityPoolSchema
    /** State. */
    state: LiquidityPoolState
}