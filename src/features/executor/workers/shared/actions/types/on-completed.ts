import type {
    Job 
} from "bullmq"
import type {
    BotSchema, JobSchema, LiquidityPoolSchema 
} from "@modules/databases"
import type {
    ActionPayload 
} from "@modules/blockchains"

/** Params for on-completed processing. */
export interface OnCompletedParams {
    /** Job schema. */
    job: JobSchema
    /** Bot schema. */
    bot: BotSchema
    /** BullMQ job. */
    bullmqJob: Job<string>
    /** Liquidity pool schema. */
    liquidityPool?: LiquidityPoolSchema
    /** Action payload. */
    payload: ActionPayload
}
