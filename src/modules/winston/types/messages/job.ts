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
}

/**
 * Action job skipped active job found in queue message.
 */
export interface JobSkippedFoundInQueueMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
    /** BullMQ job ID. */
    bullmqJobId: string
}

/**
 * Action job skipped authority not acquired message.
 */
export interface JobSkippedAuthorityNotAcquiredMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
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
    jobId: string
    /** Job type. */
    type: JobType
}

/**
 * Job skipped bot not has active position message.
 */
export interface JobSkippedBotNotHasActivePositionMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
}

/**
 * Job skipped bot not running message.
 */
export interface JobSkippedBotNotRunningMessage {
    /** Bot ID. */
    botId: string
    /** Job ID. */
    jobId: string
    /** Job type. */
    type: JobType
}