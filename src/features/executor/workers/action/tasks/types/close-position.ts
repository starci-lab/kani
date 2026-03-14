import {
    ClosePositionActionTaskPayload,
    LiquidityPoolState,
} from "@modules/blockchains"
import {
    BotSchema,
    JobSchema,
    JobType,
    LiquidityPoolSchema 
} from "@modules/databases"
import {
    Job 
} from "bullmq"

/** Base params for the CLOSE POSITION task. */
export interface ClosePositionTaskBaseParams {
    /** Bot */
    bot: BotSchema
    /** Job */
    job: JobSchema
    /** Liquidity pool */
    liquidityPool: LiquidityPoolSchema
    /** Payload */
    payload: ClosePositionActionTaskPayload
    /** State */
    state: LiquidityPoolState
    /** BullMQ job */
    bullmqJob: Job<string>
    /** Retry */
    isRetry?: boolean
    /** Job type */
    jobType: JobType
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
}

/** Params for the CLOSE POSITION SIGN step. */
export interface ClosePositionTaskExecuteParams extends ClosePositionTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the CLOSE POSITION EXECUTE step. */
export interface ClosePositionTaskExecuteParams extends ClosePositionTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the CLOSE POSITION CONFIRM step. */
export interface ClosePositionTaskConfirmParams extends ClosePositionTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the CLOSE POSITION DISPATCHER step. */
export interface ClosePositionTaskDispatcherParams extends Omit<ClosePositionTaskBaseParams, "bot" | "job"> {
    /** Bot */
    botId: string
    /** Job */
    jobId: string
    /** Task index */
    taskIndex: number
}