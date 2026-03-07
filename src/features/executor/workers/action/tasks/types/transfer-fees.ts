import {
    TransferFeesActionTaskPayload,
} from "@modules/blockchains"
import {
    Job 
} from "bullmq"
import {
    BotSchema,
    JobSchema,
} from "@modules/databases"

/** Base params for the TRANSFER FEES task. */
export interface TransferFeesTaskBaseParams {
    /** Bot */
    bot: BotSchema
    /** Job */
    job: JobSchema
    /** Payload */
    payload: TransferFeesActionTaskPayload
    /** BullMQ job */
    bullmqJob: Job<string>
    /** Retry */
    isRetry?: boolean
}

/** Params for the TRANSFER FEES PREPARE step. */
export interface TransferFeesTaskPrepareParams extends TransferFeesTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the TRANSFER FEES SIGN step. */
export interface TransferFeesTaskSignParams extends TransferFeesTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the TRANSFER FEES EXECUTE step. */
export interface TransferFeesTaskExecuteParams extends TransferFeesTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the TRANSFER FEES CONFIRM step. */
export interface TransferFeesTaskConfirmParams extends TransferFeesTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the TRANSFER FEES DISPATCHER. */
export interface TransferFeesTaskDispatcherParams extends Omit<TransferFeesTaskBaseParams, "bot" | "job"> {
    /** Bot id */
    botId: string
    /** Job id */
    jobId: string
    /** Task index */
    taskIndex: number
}
