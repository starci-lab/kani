import type {
    ClosePositionPayload,
} from "@modules/blockchains"
import type {
    DynamicLiquidityPoolInfoCacheResult,
} from "@modules/cache"
import type {
    BotSchema,
    JobSchema,
    LiquidityPoolSchema,
    TokenSchema,
} from "@modules/databases"
import type {
    Job,
} from "bullmq"

import type {
    ClosePositionJobData 
} from "./data"

/** Params for close-position processing (shared across phases). */
export interface ProcessParams {
    /** Raw BullMQ job object (queue metadata, attempts, progress, etc.). */
    bullmqJob: Job<string>

    /** Persisted job document (used for status transitions + metadata). */
    job: JobSchema

    /** Persisted bot document (holds tokens/chain config and active job state). */
    bot: BotSchema

    /** Deserialized close-position payload (botId/jobId + liquidityPoolId). */
    payload: ClosePositionPayload

    /** Liquidity pool. */
    liquidityPool: LiquidityPoolSchema

    /** Liquidity pool state. */
    dynamicLiquidityPoolInfo: DynamicLiquidityPoolInfoCacheResult

    /** Target token. */
    targetToken: TokenSchema

    /** Quote token. */
    quoteToken: TokenSchema

    /** Gas token. */
    gasToken: TokenSchema
}

/** Result of close-position phase processing. */
export interface ProcessResult {
    result: ClosePositionJobData
}
