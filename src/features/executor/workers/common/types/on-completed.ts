import type {
    Job 
} from "bullmq"
import type {
    BotSchema, JobSchema, LiquidityPoolSchema 
} from "@modules/databases"
import type {
    BullQueueName 
} from "@modules/bullmq"

/** Params for on-completed processing. */
export interface OnCompletedParams {
    job: JobSchema
    bot: BotSchema
    bullmqJob: Job<string>
    queueName: BullQueueName
    liquidityPool?: LiquidityPoolSchema
}
