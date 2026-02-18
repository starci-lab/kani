import type {
    LiquidityPoolId, 
    TaskType
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
    type: TaskType
}

export class ActionJobTasktxExecuteMaxAttemptsException extends AbstractException {
    constructor(
        { 
            maxAttempts, 
            originalError,
            botId,
            jobId,
            metadata,
            type,
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
                type,
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
    type: TaskType
}

export class ActionJobTaskPrepareMaxAttemptsException extends AbstractException {
    constructor(
        { 
            maxAttempts, 
            originalError,
            botId,
            jobId,
            metadata,
            type,
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
                type,
                originalError,
            }
        )
    }
}