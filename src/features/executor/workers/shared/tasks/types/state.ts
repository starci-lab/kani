import {
    LiquidityPoolState 
} from "@modules/blockchains"
import {
    JobSchema, BotSchema, LiquidityPoolSchema 
} from "@modules/databases"

/** Parameters for loading the action context. */
export interface LoadLiquidityPoolExecutionContextParams extends LoadExecutionContextParams {
    /** Liquidity pool ID. */
    liquidityPoolId: string
    /** State. */
    state?: LiquidityPoolState
}

/** Result for loading the action context. */
export interface LoadLiquidityPoolExecutionContextResult extends LoadExecutionContextResult {
    /** Liquidity pool. */
    liquidityPool: LiquidityPoolSchema
    /** State. */
    state: LiquidityPoolState
}

export interface LoadExecutionContextParams {
    /** Job ID. */
    jobId: string
    /** Bot ID. */
    botId: string
}

export interface LoadExecutionContextResult {
    /** Job. */
    job: JobSchema
    /** Bot. */
    bot: BotSchema
}