import type {
    BalanceAmounts,
} from "@modules/common"

export interface ReconcileBalanceEnqueueFailedMessage {
    botId: string
    error: string
    bullmqJobId?: string
}

export interface ReconcileBalanceEnqueuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

export interface ReconcileBalanceJobEnqueuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

export interface ReconcileBalanceJobEnqueueFailedMessage {
    botId: string
    jobId: string
    error: string
}

export interface ReconcileBalanceJobRequeuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

export interface ReconcileBalanceJobRequeueFailedMessage {
    botId: string
    jobId: string
    error: string
}

export interface ReconcileBalanceRequeueFailedMessage {
    error: string
}

export interface ReconcileBalanceJobCompletedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

export interface ReconcileBalanceProcessingStartedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

export interface ReconcileBalanceJobAlreadyPreparedMessage {
    botId: string
    jobId: string
    ageMs: number
    quoteRatioResult?: object
    balanceAmounts?: BalanceAmounts
    txHashes?: Array<string>
}

export interface ReconcileBalanceJobAlreadyExecutedMessage {
    botId: string
    jobId: string
    ageMs: number
}

export interface ReconcileBalanceJobAlreadyConfirmedMessage {
    botId: string
    jobId: string
    ageMs: number
}

export interface ReconcileBalanceJobConfirmedMessage {
    botId: string
    jobId: string
}

export interface ReconcileBalanceJobPreparedMessage {
    botId: string
    jobId: string
    txHashes?: Array<string>
    quoteRatioResult?: object
    balanceAmounts: BalanceAmounts
}

export interface ReconcileBalanceBootstrappingFailedMessage {
    botId: string
    error: string
    jobId: string
    bullmqJobId?: string
}

export interface ReconcileBalanceJobAlreadyEnqueuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

export interface WithdrawJobEnqueueFailedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

export interface WithdrawJobScheduledMessage {
    botId: string
    tokenInputs: Array<{ id: string; amount: string }>
    toUsdc: boolean
}

export interface WithdrawJobEnqueuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

export interface WithdrawJobRequeuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

export interface WithdrawJobRequeueFailedMessage {
    botId: string
    jobId: string
    error: string
}

export interface WithdrawJobCompletedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

export interface WithdrawJobStartedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

export interface WithdrawRequeueFailedMessage {
    error: string
}

export interface WithdrawJobAlreadyPreparedMessage {
    botId: string
    jobId: string
    ageMs: number
    txHashes: Array<string>
}

export interface WithdrawJobAlreadyExecutedMessage {
    botId: string
    jobId: string
    ageMs: number
}

export interface WithdrawJobAlreadyConfirmedMessage {
    botId: string
    jobId: string
    ageMs: number
}

export interface WithdrawJobPreparedMessage {
    botId: string
    jobId: string
    txHashes: Array<string>
}

export interface WithdrawJobConfirmedMessage {
    botId: string
    jobId: string
}

export interface WithdrawBootstrappingFailedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

export interface WithdrawJobAlreadyEnqueuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}
