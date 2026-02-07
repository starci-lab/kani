import type {
    LiquidityPoolState,
    OpenPositionPayload,
} from "@modules/blockchains"
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
    OpenPositionJobData 
} from "./data"

/** Params for open-position processing (shared across phases). */
export interface ProcessParams {
    /** Raw BullMQ job object (queue metadata, attempts, progress, etc.). */
    bullmqJob: Job<string>

    /** Persisted job document (used for status transitions + metadata). */
    job: JobSchema

    /** Persisted bot document (holds tokens/chain config and active job state). */
    bot: BotSchema

    /** Deserialized open-position payload (botId/jobId + optional balances). */
    payload: OpenPositionPayload

    /** Liquidity pool. */
    liquidityPool: LiquidityPoolSchema

    /** Liquidity pool state. */
    state: LiquidityPoolState

    /** Target token. */
    targetToken: TokenSchema

    /** Quote token. */
    quoteToken: TokenSchema

    /** Gas token. */
    gasToken: TokenSchema
}

/** Result of open-position phase processing. */
export interface ProcessResult {
    data: Partial<OpenPositionJobData>
}
