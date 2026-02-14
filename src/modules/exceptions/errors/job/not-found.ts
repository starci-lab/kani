import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    LiquidityPoolId
} from "@modules/databases"
/** Metadata for job not found. */
export interface JobNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    jobId: string
}

/** Thrown when job cannot be found. */
export class JobNotFoundException extends AbstractException {
    constructor(
        { jobId, originalError }: JobNotFoundExceptionMetadata
    ) {
        super(
            "Job not found", 
            "JOB_NOT_FOUND_EXCEPTION", 
            {
                jobId,
                originalError,
            }
        )
    }
}

/** Thrown when sign result is not found. */
export interface SignResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    taskIndex: number
    stepIndex: number
}

/** Thrown when sign result is not found. */
export class SignResultNotFoundException extends AbstractException {
    constructor({
        botId,
        jobId,
        liquidityPoolId,
        taskIndex,
        stepIndex,
    }: SignResultNotFoundExceptionMetadata) {
        super(
            "Sign result not found",
            "SIGN_RESULT_NOT_FOUND_EXCEPTION",
            {
                botId,
                jobId,
                liquidityPoolId,
                taskIndex,
                stepIndex,
            }
        )
    }
}

/** Thrown when prepare result is not found. */
export interface PrepareResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    taskIndex: number
}

/** Thrown when prepare result is not found. */
export class PrepareResultNotFoundException extends AbstractException {
    constructor({
        botId,
        jobId,
        liquidityPoolId,
        taskIndex,
    }: PrepareResultNotFoundExceptionMetadata) {
        super(
            "Prepare result not found",
            "PREPARE_RESULT_NOT_FOUND_EXCEPTION",
            {
                botId,  
                jobId,
                liquidityPoolId,
                taskIndex,
            }
        )
    }
}

/** Thrown when signed tx is not found. */
export interface SignedTxNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    liquidityPoolId?: LiquidityPoolId
    taskIndex: number
    stepIndex: number
}

/** Thrown when signed tx is not found. */
export class SignedTxNotFoundException extends AbstractException {
    constructor({
        botId,
        jobId,
        liquidityPoolId,
        taskIndex,
        stepIndex,
    }: SignedTxNotFoundExceptionMetadata) {
        super(
            "Signed tx not found",
            "SIGNED_TX_NOT_FOUND_EXCEPTION",
            {
                botId,  
                jobId,
                liquidityPoolId,
                taskIndex,
                stepIndex,
            }
        )
    }
}