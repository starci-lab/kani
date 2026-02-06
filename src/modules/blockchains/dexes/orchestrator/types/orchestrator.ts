import {
    BotSchema,
    LiquidityPoolSchema
} from "@modules/databases"
import {
    DynamicLiquidityPoolInfoCacheResult
} from "@modules/cache"

/**
 * Parameters for orchestrating reserves with fees.
 */
export interface OrchestrateReservesWithFeesParams {
    /** Bot schema. */
    bot: BotSchema
    /** Liquidity pool schema. */
    liquidityPool: LiquidityPoolSchema
}

/**
 * Parameters for enqueuing open position.
 */
export interface EnqueueOpenPositionParams {
    /** Bot schema. */
    bot: BotSchema
    /** Liquidity pool schema. */
    liquidityPool: LiquidityPoolSchema
    /** Job ID. */
    jobId: string
    /** Whether this is a retry. */
    isRetry?: boolean
    /** Optional dynamic liquidity pool info. */
    dynamicLiquidityPoolInfo?: DynamicLiquidityPoolInfoCacheResult
}

/**
 * Parameters for enqueuing close position.
 */
export interface EnqueueClosePositionParams {
    /** Bot schema. */
    bot: BotSchema
    /** Liquidity pool schema. */
    liquidityPool: LiquidityPoolSchema
    /** Job ID. */
    jobId: string
    /** Whether this is a retry. */
    isRetry?: boolean
    /** Optional dynamic liquidity pool info. */
    dynamicLiquidityPoolInfo?: DynamicLiquidityPoolInfoCacheResult
}
