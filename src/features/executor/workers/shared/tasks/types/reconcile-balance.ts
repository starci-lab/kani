import {
    Job 
} from "bullmq"

/** Base params for the CLOSE POSITION task. */
export interface ReconcileBalanceTaskBaseParams {
    /** Bot ID */
    botId: string
    /** Job ID */
    jobId: string
    /** Bull MQ job*/
    bullmqJob: Job<string>  
    /** Retry */
    isRetry?: boolean
}

/** Params for the RECONCILE BALANCE PREPARE step. */
export interface ReconcileBalanceTaskPrepareParams extends ReconcileBalanceTaskBaseParams {
    /** Task index */
    index: string
}

/** Params for the RECONCILE BALANCE SIGN step. */
export interface ReconcileBalanceTaskSignParams extends ReconcileBalanceTaskBaseParams {
    /** Task index */
    taskIndex: number
    /** Step index */
    stepIndex: number
}

/** Params for the RECONCILE BALANCE SIGN step. */
export interface ReconcileBalanceTaskExecuteParams extends ReconcileBalanceTaskBaseParams {
    /** Task index */
    taskIndex: number
    /** Step index */
    stepIndex: number
}

/** Params for the RECONCILE BALANCE EXECUTE step. */
export interface ReconcileBalanceTaskExecuteParams extends ReconcileBalanceTaskBaseParams {
    /** Task index */
    taskIndex: number
    /** Step index */
    stepIndex: number
}