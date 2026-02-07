import type {
    Job 
} from "bullmq"
import type {
    BotSchema, JobSchema, LiquidityPoolSchema 
} from "@modules/databases"
import type {
    BullQueueName 
} from "@modules/bullmq"

/** Params for on-failed processing. */
export interface OnFailedParams {
    job: JobSchema
    bot: BotSchema
    bullmqJob: Job<string>
    error: Error
    queueName: BullQueueName
    liquidityPool?: LiquidityPoolSchema
}
