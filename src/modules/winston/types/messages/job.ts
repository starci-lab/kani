import type {
    SettleStrategyResult 
} from "@modules/blockchains"
import {
    JobFailureStrategy 
} from "@modules/common"
import {
    JobType, 
    LiquidityPoolId,
    QuoteRatioStatus,
    TokenId,
    TaskType,
} from "@modules/databases"

/**
 * Job enqueued message.
 */
export interface JobEnqueuedMessage {
    /** BullMQ job ID. */
    bullmqJobId?: string
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job enqueue failed message.
 */
export interface JobEnqueueFailedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId?: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
    /** Error. */
    error: string
}

/**
 * Action job completed message.
 */
export interface ActionJobCompletedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
    /** Metadata. */
    metadata?: unknown
}

/**
 * Action job failed message.
 */
export interface ActionJobFailedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Metadata. */
    metadata?: unknown
    /** Error. */
    error: string
    /** Attempts made. */
    attemptsMade?: number
    /** Job failure strategy. */
    strategy: JobFailureStrategy
}

/**
 * Action job context load failed message.
 */
export interface ActionJobContextLoadFailedMessage {
    /** Job ID. */
    jobId: string
    /** Bot ID. */
    botId: string
    /** Error. */
    error: string
    /** Job type. */
    type: JobType
}


/**
 * Active job prepared message.
 */
export interface ActiveJobTaskPreparedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Tx count. */
    txCount: number
    /** Metadata. */
    metadata?: unknown
    /** Task index. */
    taskIndex: number
    /** Task type. */
    taskType: TaskType
}

/**
 * Action job confirmed message.
 */
export interface ActionJobTaskConfirmedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Metadata. */
    metadata?: unknown
    /** Task index. */
    taskIndex: number
    /** Task type. */
    taskType: TaskType
}

/**
 * Action job skipped active job found in queue message.
 */
export interface JobSkippedFoundInQueueMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId?: string
    /** Job type. */
    type: JobType
    /** BullMQ job ID. */
    bullmqJobId: string
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Action job skipped authority not acquired message.
 */
export interface JobSkippedBotAuthorityNotAcquiredMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId?: string
    /** Job type. */
    type: JobType
}

/**
 * Job requeued message.
 */
export interface JobRequeuedMessage {
    /** Job ID. */
    jobId: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Metadata. */
    metadata?: unknown
    /** BullMQ job ID. */
    bullmqJobId?: string
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job requeue failed message.
 */
export interface JobRequeueFailedMessage {
    /** Job ID. */
    jobId: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Error. */
    error: string
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped not found in database message.
 */
export interface JobSkippedNotFoundInDatabaseMessage {
    /** Job ID. */
    jobId: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
}

/**
 * Job skipped context load failed message.
 */
export interface JobSkippedContextLoadFailedMessage {
    /** Job ID. */
    jobId: string
    /** Bot ID. */
    botId: string
    /** Error. */
    error: string
    /** Job type. */
    type: JobType
}

/**
 * Job skipped bot already has active position message.
 */
export interface JobSkippedBotAlreadyHasActivePositionMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId?: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped bot not has active position message.
 */
export interface JobSkippedBotNotHasActivePositionMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId?: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped bot position not closed message.
 */
export interface JobSkippedBotPositionNotClosedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId?: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped bot position closed message.
 */
export interface JobSkippedBotPositionClosedMessage {
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped bot not running message.
 */
export interface JobSkippedBotNotRunningMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId?: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped liquidity pool context load failed message.
 */
export interface JobSkippedLiquidityPoolContextLoadFailedMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Error. */
    error: string
    /** Job type. */
    type: JobType
}

/**
 * Job skipped balance snapshot within cooldown message.
 */
export interface JobSkippedBotBalanceSnapshotWithinCooldownMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped balance snapshot not within cooldown message.
 */
export interface JobSkippedBotBalanceSnapshotNotWithinCooldownMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}
/**
 * Job skipped cannot settle position message.
 */
export interface JobSkippedCannotSettlePositionMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
    /** Strategy results. */
    strategyResults?: Array<SettleStrategyResult>
}

/**
 * Job skipped no balance snapshot message.
 */
export interface JobSkippedBotNoBalanceSnapshotMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped bot already has active job message.
 */
export interface JobSkippedBotAlreadyHasActiveJobMessage {
    /** Job ID. */
    jobId: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped bot not eligible message.
 */
export interface JobSkippedBotNotEligibleMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped liquidity pool info not ready message.
 */
export interface JobSkippedLiquidityPoolInfoNotReadyMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped token price not ready message.
 */
export interface JobSkippedTokenPriceNotReadyMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
    /** Token ID. */
    tokenId: TokenId
}

/**
 * Job skipped no payload message.
 */
export interface JobSkippedNoPayloadMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
}

/**
 * Job skipped bot running message.
 */
export interface JobSkippedBotRunningMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
}

/**
 * Job skipped liquidity pool not owned by bot message.
 */
export interface JobSkippedLiquidityPoolNotOwnedByBotMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job skipped quote ratio not good message.
 */
export interface JobSkippedQuoteRatioNotGoodMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
    /** Quote ratio. */
    quoteRatio: number
    /** Quote ratio status. */
    quoteRatioStatus: QuoteRatioStatus
}

/**
 * Job skipped bot cache result found message.
 */
export interface JobSkippedBotCacheResultFoundMessage {
    /** Job ID. */
    jobId?: string
    /** Bot ID. */
    botId: string
    /** Job type. */
    type: JobType
}

/**
 * Action job task step signed message.
 */
export interface ActionJobTaskStepSignedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Task index. */
    taskIndex: number
    /** Task type. */
    taskType: TaskType
    /** Step index. */
    stepIndex: number
    /** Metadata. */
    metadata?: unknown
}

/**
 * Action job task step executed message.
 */
export interface ActionJobTaskStepExecutedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Task index. */
    taskIndex: number
    /** Task type. */
    taskType: TaskType
    /** Step index. */
    stepIndex: number
    /** Metadata. */
    metadata?: unknown
}

/**
 * Action job task step signed failed message.
 */
export interface ActionJobTaskStepSignedFailedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Task index. */
    taskIndex: number
    /** Task type. */
    taskType: TaskType
    /** Step index. */
    stepIndex: number
    /** Error. */
    error: string
    /** Metadata. */
    metadata?: unknown
}

/**
 * Action job task step executed failed message.
 */
export interface ActionJobTaskStepExecutedFailedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Task index. */
    taskIndex: number
    /** Task type. */
    taskType: TaskType
    /** Step index. */
    stepIndex: number
    /** Error. */
    error: string
    /** Metadata. */
    metadata?: unknown
}

/**
 * Active job task prepared failed message.
 */
export interface ActiveJobTaskPreparedFailedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Error. */
    error: string
    /** Task index. */
    taskIndex: number
    /** Task type. */
    taskType: TaskType
    /** Metadata. */
    metadata?: unknown
}

/**
 * Action job task confirmed failed message.
 */
export interface ActionJobTaskConfirmedFailedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Error. */
    error: string
    /** Task index. */
    taskIndex: number
    /** Task type. */
    taskType: TaskType
    /** Metadata. */
    metadata?: unknown
}