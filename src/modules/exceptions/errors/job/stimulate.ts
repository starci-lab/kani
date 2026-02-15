import {
    AbstractExceptionMetadata, AbstractException
} from "../abstract"
import type {
    LiquidityPoolId 
} from "@modules/databases"

/** Thrown when job stimulation fails */
export interface ActionJobStimulateMongoSessionExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    liquidityPoolId?: LiquidityPoolId
    jobId: string
    taskIndex: number
}

export class ActionJobStimulateMongoSessionException extends AbstractException {
    constructor(
        {
            botId,
            jobId,
            taskIndex,
            liquidityPoolId,
            originalError,
        }: ActionJobStimulateMongoSessionExceptionMetadata
    ) {
        super(
            "Action job mongo session stimulation failed",
            "ACTION_JOB_STIMULATE_MONGO_SESSION_EXCEPTION",
            {
                botId,
                liquidityPoolId,
                jobId,
                taskIndex,
                originalError,
            }
        )
    }
}