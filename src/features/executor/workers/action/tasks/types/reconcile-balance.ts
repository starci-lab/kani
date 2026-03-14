import {
    ReconcileBalanceActionTaskPayload,
} from "@modules/blockchains"
import {
    Job,
} from "bullmq"
import {
    BotSchema,
    JobSchema,
    JobType,
} from "@modules/databases"

/** Base params for the CLOSE POSITION task. */
export interface ReconcileBalanceTaskBaseParams {
    /** Bot */
    bot: BotSchema
    /** Job */
    job: JobSchema
    /** Payload */
    payload: ReconcileBalanceActionTaskPayload
    /** BullMQ job */
    bullmqJob: Job<string>
    /** Retry */
    isRetry?: boolean
    /** Job type */
    jobType: JobType
}

/** Params for the CLOSE POSITION PREPARE step. */
export interface ReconcileBalanceTaskPrepareParams extends ReconcileBalanceTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the RECONCILE BALANCE SIGN step. */
export interface ReconcileBalanceTaskSignParams extends ReconcileBalanceTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the RECONCILE BALANCE EXECUTE step. */
export interface ReconcileBalanceTaskExecuteParams extends ReconcileBalanceTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the RECONCILE BALANCE EXECUTE step. */
export interface ReconcileBalanceTaskExecuteParams extends ReconcileBalanceTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the RECONCILE BALANCE CONFIRM step. */
export interface ReconcileBalanceTaskConfirmParams extends ReconcileBalanceTaskBaseParams {
    /** Task index */
    taskIndex: number
}

/** Params for the RECONCILE BALANCE DISPATCHER step. */
export interface ReconcileBalanceTaskDispatcherParams extends Omit<ReconcileBalanceTaskBaseParams, "bot" | "job"> {
    /** Bot */
    botId: string
    /** Job */
    jobId: string
    /** Task index */
    taskIndex: number
}