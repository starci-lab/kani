import {
    LiquidityPoolId,
    TokenId,
} from "@modules/databases"

export interface OpenPositionJobEnqueuedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    bullmqJobId?: string
}

export interface OpenPositionJobEnqueueFailedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    error: string
}

export interface OpenPositionJobRequeuedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    bullmqJobId?: string
}

export interface OpenPositionJobRequeueFailedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    error: string
}

export interface OpenPositionSkippedDynamicLiquidityPoolInfoNotReadyMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
}

export interface OpenPositionSkippedPriceNotReadyMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    tokenId: TokenId
}

export interface ClosePositionJobEnqueuedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    bullmqJobId?: string
}

export interface ClosePositionJobEnqueueFailedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    bullmqJobId?: string
    error: string
}

export interface ClosePositionJobRequeuedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    bullmqJobId?: string
}

export interface ClosePositionJobRequeueFailedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    error: string
}

export interface OpenPositionJobAlreadyPreparedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    txHashes: Array<string>
    ageMs: number
}

export interface OpenPositionJobAlreadyExecutedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

export interface OpenPositionJobAlreadyConfirmedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

export interface OpenPositionJobPreparedMessage {
    botId: string
    jobId: string
    txHashes: Array<string>
    liquidityPoolId: LiquidityPoolId
}

export interface OpenPositionJobConfirmedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
}

export interface OpenPositionJobStartedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

export interface OpenPositionJobCompletedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    liquidityPoolId: LiquidityPoolId
}

export interface JobFailedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    liquidityPoolId?: string
    attemptsMade?: number
    strategy?: number
}

export interface OpenPositionRequeueFailedMessage {
    error: string
}

export interface OpenPositionBootstrappingFailedMessage {
    botId: string
    error: string
    jobId: string
    bullmqJobId?: string
}

export interface OpenPositionJobAlreadyEnqueuedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    bullmqJobId?: string
}

export interface ClosePositionJobPreparedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    txHashes: Array<string>
}

export interface ClosePositionJobAlreadyPreparedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    txHashes: Array<string>
    ageMs: number
}

export interface ClosePositionJobAlreadyExecutedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

export interface ClosePositionJobAlreadyConfirmedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

export interface ClosePositionJobConfirmedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

export interface ClosePositionJobCompletedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    liquidityPoolId: LiquidityPoolId
}

export interface ClosePositionRequeueFailedMessage {
    error: string
}

export interface ClosePositionBootstrappingFailedMessage {
    botId: string
    error: string
    jobId: string
    bullmqJobId?: string
}

export interface ClosePositionJobAlreadyEnqueuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    liquidityPoolId: LiquidityPoolId
}

export interface OpenPositionSkippedBotNotRunningMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
}

export interface OpenPositionSkippedBotAlreadyHasActivePositionMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
}

export interface OpenPositionSkippedBotAlreadyHasActiveJobMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
}

export interface OpenPositionSkippedNotEligibleMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
}

export interface OpenPositionSkippedBalanceSnapshotTooOldMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
}