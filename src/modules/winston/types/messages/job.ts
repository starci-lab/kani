import {
    JobVariant, 
    LiquidityPoolId
} from "@modules/databases"

/**
 * Job enqueued message.
 */
export interface JobEnqueuedMessage {
    botId: string
    jobId: string
    variant: JobVariant
    liquidityPoolId?: LiquidityPoolId
}

/**
 * Job enqueue failed message.
 */
export interface JobEnqueueFailedMessage {
    botId: string
    jobId: string
    variant: JobVariant
    liquidityPoolId?: LiquidityPoolId
    error: string
}