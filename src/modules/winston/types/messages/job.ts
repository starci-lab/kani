import {
    JobType, 
    LiquidityPoolId,
} from "@modules/databases"

/**
 * Job enqueued message.
 */
export interface JobEnqueuedMessage {
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
    jobId: string
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
export interface ActiveJobPreparedMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** Tx count. */
    txCount: number
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
    /** Metadata. */
    metadata?: unknown
}

/**
 * Action job confirmed message.
 */
export interface ActionJobConfirmedMessage {
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