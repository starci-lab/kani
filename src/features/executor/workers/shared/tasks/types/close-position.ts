import {
    LiquidityPoolState, 
} from "@modules/blockchains"
import {
    Job 
} from "bullmq"

/** Base params for the CLOSE POSITION task. */
export interface ClosePositionTaskBaseParams {
    /** Bot ID */
    botId: string
    /** Liquidity pool ID */
    liquidityPoolId: string
    /** Job ID */
    jobId: string
    /** Bull MQ job*/
    bullmqJob: Job<string>  
    /** Pool state */
    state?: LiquidityPoolState
    /** Retry */
    isRetry?: boolean
}

/** Params for the CLOSE POSITION PREPARE step. */
export interface ClosePositionTaskPrepareParams extends ClosePositionTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the CLOSE POSITION PLAN step. */
export interface ClosePositionTaskSignParams extends ClosePositionTaskBaseParams {
    /** Task index */
    taskIndex: number
    /** Step index */
    stepIndex: number
}

/** Params for the CLOSE POSITION SIGN step. */
export interface ClosePositionTaskExecuteParams extends ClosePositionTaskBaseParams {
    /** Task index */
    taskIndex: number
    /** Step index */
    stepIndex: number
}

/** Params for the CLOSE POSITION EXECUTE step. */
export interface ClosePositionTaskExecuteParams extends ClosePositionTaskBaseParams {
    /** Task index */
    taskIndex: number
    /** Step index */
    stepIndex: number
}