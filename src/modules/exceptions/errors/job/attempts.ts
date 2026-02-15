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
export interface ActionJobTaskTxSendMaxAttemptsExceptionMetadata extends AbstractExceptionMetadata {
    maxAttempts: number
    botId: string  
    jobId: string
    liquidityPoolId?: LiquidityPoolId
    metadata?: unknown
    type: TaskType
}

export class ActionJobTaskTxSendMaxAttemptsException extends AbstractException {
    constructor(
        { 
            maxAttempts, 
            originalError,
            botId,
            jobId,
            metadata,
            type,
        }: ActionJobTaskTxSendMaxAttemptsExceptionMetadata
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