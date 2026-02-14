import {
    LiquidityPoolState 
} from "@modules/blockchains"

/** Params for the OPEN POSITION PREPARE step. */
export interface OpenPositionTaskPrepareParams {
    /** Bot ID. */
    botId: string
    /** Liquidity pool ID. */
    liquidityPoolId: string
    /** Job ID. */
    jobId: string
    /** State. */
    state: LiquidityPoolState
    /** Task index */
    index: string
}

/** Params for the OPEN POSITION PLAN step. */
export interface OpenPositionTaskExecuteParams {
    /** Bot ID. */
    botId: string
    /** Liquidity pool ID. */
    liquidityPoolId: string
    /** Job ID. */
    jobId: string
    /** State. */
    state: LiquidityPoolState
}