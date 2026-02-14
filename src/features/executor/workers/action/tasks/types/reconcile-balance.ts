import {
    ClosePositionActionTaskPayload,
} from "@modules/blockchains"
import {
    BotSchema, 
    JobSchema, 
} from "@modules/databases"
import {
    Job 
} from "bullmq"

/** Base params for the CLOSE POSITION task. */
export interface ReconcileBalanceTaskBaseParams {
    /** Bot */
    bot: BotSchema
    /** Job */
    job: JobSchema
    /** Payload */
    payload: ClosePositionActionTaskPayload
    /** BullMQ job */
    bullmqJob: Job<string>
    /** Retry */
    isRetry?: boolean
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
export interface ReconcileBalanceTaskDispatcherParams extends ReconcileBalanceTaskBaseParams {
    /** Task index */
    taskIndex: number
}