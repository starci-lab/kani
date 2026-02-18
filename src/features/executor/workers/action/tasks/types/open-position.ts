import {
    ClosePositionActionTaskPayload,
    LiquidityPoolState,
} from "@modules/blockchains"
import {
    LiquidityPoolSchema,
    BotSchema,
    JobSchema,
} from "@modules/databases"
import {
    Job 
} from "bullmq"

/** Base params for the CLOSE POSITION task. */
export interface OpenPositionTaskBaseParams {
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
}

/** Params for the CLOSE POSITION PREPARE step. */
export interface OpenPositionTaskPrepareParams extends OpenPositionTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the CLOSE POSITION PLAN step. */
export interface OpenPositionTaskSignParams extends OpenPositionTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the CLOSE POSITION SIGN step. */
export interface OpenPositionTaskExecuteParams extends OpenPositionTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the CLOSE POSITION EXECUTE step. */
export interface OpenPositionTaskExecuteParams extends OpenPositionTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the CLOSE POSITION CONFIRM step. */
export interface OpenPositionTaskConfirmParams extends OpenPositionTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the CLOSE POSITION DISPATCHER step. */
export interface OpenPositionTaskDispatcherParams extends Omit<OpenPositionTaskBaseParams, "bot" | "job"> {
    /** Bot */
    botId: string
    /** Job */
    jobId: string
    /** Task index */
    taskIndex: number
}