import type {
    LiquidityPoolId, 
    TaskType,
    JobType
} from "@modules/databases"
import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/**
 * Metadata for job attempts exception.
 */
export interface ActionJobTasktxExecuteMaxAttemptsExceptionMetadata extends AbstractExceptionMetadata {
    maxAttempts: number
    botId: string  
    jobId: string
    liquidityPoolId?: LiquidityPoolId
    metadata?: unknown
    jobType: JobType
    taskType: TaskType
    taskIndex: number

}

export class ActionJobTasktxExecuteMaxAttemptsException extends AbstractException {
    constructor(
        { 
            maxAttempts, 
            originalError,
            botId,
            jobId,
            metadata,
            jobType,
            taskType,
            taskIndex,
        }: ActionJobTasktxExecuteMaxAttemptsExceptionMetadata
    ) {
        super(
            "Action job task tx send max attempts exception",
            "ACTION_JOB_TASK_TX_SEND_MAX_ATTEMPTS_EXCEPTION",
            {
                maxAttempts,
                botId,
                jobId,
                metadata,
                jobType,
                taskType,
                taskIndex,
                originalError,
            }
        )
    }
}

/**
 * Metadata for job prepare attempts exception.
 */
export interface ActionJobTaskPrepareMaxAttemptsExceptionMetadata extends AbstractExceptionMetadata {
    maxAttempts: number
    botId: string  
    jobId: string
    metadata?: unknown
    jobType: JobType
    taskType: TaskType
    taskIndex: number
}

export class ActionJobTaskPrepareMaxAttemptsException extends AbstractException {
    constructor(
        { 
            maxAttempts, 
            originalError,
            botId,
            jobId,
            metadata,
            jobType,
            taskType,
            taskIndex,
        }: ActionJobTaskPrepareMaxAttemptsExceptionMetadata
    ) {
        super(
            "Action job task prepare max attempts exception",
            "ACTION_JOB_TASK_PREPARE_MAX_ATTEMPTS_EXCEPTION",
            {
                maxAttempts,
                botId,
                jobId,
                metadata,
                jobType,
                taskType,
                taskIndex,
                originalError,
            }
        )
    }
}

/**
 * Metadata for job prepare max retries exception.
 */
export interface ActionJobTaskPrepareMaxRetriesExceptionMetadata extends AbstractExceptionMetadata {
    maxRetries: number
    botId: string
    jobId: string
    metadata?: unknown
    jobType: JobType
    taskType: TaskType
    taskIndex: number
}

export class ActionJobTaskPrepareMaxRetriesException extends AbstractException {
    constructor(
        {
            maxRetries,
            originalError,
            botId,
            jobId,
            metadata,
            jobType,
            taskType,
            taskIndex,
        }: ActionJobTaskPrepareMaxRetriesExceptionMetadata
    ) {
        super(
            "Action job task prepare max retries exception",
            "ACTION_JOB_TASK_PREPARE_MAX_RETRIES_EXCEPTION",
            {
                maxRetries,
                botId,
                jobId,
                metadata,
                jobType,
                taskType,
                taskIndex,
                originalError,
            }
        )
    }
}