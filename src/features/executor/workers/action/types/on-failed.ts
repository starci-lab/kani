import type {
    Job 
} from "bullmq"
import type {
    BotSchema, JobSchema, LiquidityPoolSchema 
} from "@modules/databases"
import type {
    JobType 
} from "@modules/databases"
/** Params for on-failed processing. */
export interface OnFailedParams {
    /** Job schema. */
    job: JobSchema
    /** Bot schema. */
    bot: BotSchema
    /** BullMQ job. */
    bullmqJob: Job<string>
    /** Error. */
    error: Error
    /** Liquidity pool schema. */
    liquidityPool?: LiquidityPoolSchema
    /** Job type. */
    jobType: JobType
}
