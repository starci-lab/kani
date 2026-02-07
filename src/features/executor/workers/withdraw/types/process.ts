import type {
    WithdrawPayload,
} from "@modules/blockchains"
import type {
    BotSchema,
    JobSchema,
} from "@modules/databases"
import type {
    Job,
} from "bullmq"

import type {
    WithdrawJobData 
} from "./data"

/** Params for withdraw processing (shared across phases). */
export interface ProcessParams {
    /** Raw BullMQ job object (queue metadata, attempts, progress, etc.). */
    bullmqJob: Job<string>

    /** Persisted job document (used for status transitions + metadata). */
    job: JobSchema

    /** Persisted bot document (holds tokens/chain config and active job state). */
    bot: BotSchema

    /** Deserialized withdraw payload (botId/jobId + optional balances). */
    payload: WithdrawPayload
}

/** Result of withdraw phase processing. */
export interface ProcessResult {
    data: Partial<WithdrawJobData>
}
