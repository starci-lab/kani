import {
    WithdrawActionTaskPayload,
} from "@modules/blockchains"
import {
    Job 
} from "bullmq"
import {
    BotSchema,
    JobSchema,
} from "@modules/databases"

/** Base params for the CLOSE POSITION task. */
export interface WithdrawTaskBaseParams {
    /** Bot */
    bot: BotSchema
    /** Job */
    job: JobSchema
    /** Payload */
    payload: WithdrawActionTaskPayload
    /** BullMQ job */
    bullmqJob: Job<string>
    /** Retry */
    isRetry?: boolean
}

/** Params for the CLOSE POSITION PREPARE step. */
export interface WithdrawTaskPrepareParams extends WithdrawTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the RECONCILE BALANCE SIGN step. */
export interface WithdrawTaskSignParams extends WithdrawTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the RECONCILE BALANCE EXECUTE step. */
export interface WithdrawTaskExecuteParams extends WithdrawTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the RECONCILE BALANCE EXECUTE step. */
export interface WithdrawTaskExecuteParams extends WithdrawTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the RECONCILE BALANCE CONFIRM step. */
export interface WithdrawTaskConfirmParams extends WithdrawTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the RECONCILE BALANCE DISPATCHER step. */
export interface WithdrawTaskDispatcherParams extends Omit<WithdrawTaskBaseParams, "bot" | "job"> {
    /** Bot */
    botId: string
    /** Job */
    jobId: string
    /** Task index */
    taskIndex: number
}