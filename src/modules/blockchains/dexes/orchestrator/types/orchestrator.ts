import {
    BotSchema,
    JobSchema,
    LiquidityPoolSchema,
    PositionSettlementSchema,
} from "@modules/databases"
import {
    LiquidityPoolState
} from "../../../types"
/**
 * Parameters for orchestrating reserves with fees.
 */
export interface OrchestrateReservesWithFeesParams {
    /** Bot schema. */
    bot: BotSchema
    /** Liquidity pool schema. */
    liquidityPool: LiquidityPoolSchema
    /** Dynamic liquidity pool info. */
    state: LiquidityPoolState
}

/**
 * Parameters for enqueuing open position.
 */
export interface EnqueueOpenPositionParams {
    /** Bot schema. */
    bot: BotSchema
    /** Liquidity pool schema. */
    liquidityPool: LiquidityPoolSchema
    /** Old job (Optional) */
    oldJob?: JobSchema
    /** Whether this is a retry. */
    isRetry?: boolean
}

/**
 * Parameters for enqueuing close position.
 */
export interface EnqueueClosePositionParams {
    /** Bot schema. */
    bot: BotSchema
    /** Liquidity pool schema. */
    liquidityPool: LiquidityPoolSchema
    /** Use  */
    /** Whether this is a retry. */
    isRetry?: boolean
    /** Old job (Optional) */
    oldJob?: JobSchema
    /** Position settlements. */
    positionSettlements?: Array<Partial<PositionSettlementSchema>>
}

/**
 * Result of validating a close position job.
 */
export interface ValidateClosePositionResult {
    /** Whether the close position job is valid. */
    isValid: boolean
    /** The position settlements. */
    positionSettlements?: Array<Partial<PositionSettlementSchema>>
}