import {
    LiquidityPoolState 
} from "@modules/blockchains"
import {
    JobSchema, BotSchema, LiquidityPoolSchema 
} from "@modules/databases"

/** Parameters for loading the action context. */
export interface LoadActionExecutionContextParams {
    /** Job ID. */
    jobId: string
    /** Bot ID. */
    botId: string
    /** Liquidity pool ID. */
    liquidityPoolId: string
}

/** Result for loading the action context. */
export interface LoadActionExecutionContextResult {
    /** Job. */
    job: JobSchema
    /** Bot. */
    bot: BotSchema
    /** Liquidity pool. */
    liquidityPool: LiquidityPoolSchema
    /** State. */
    state: LiquidityPoolState
}