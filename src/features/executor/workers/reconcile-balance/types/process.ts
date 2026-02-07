import type {
    ReconcileBalancePayload,
} from "@modules/blockchains"
import type {
    BotSchema,
    JobSchema,
} from "@modules/databases"
import type {
    Job,
} from "bullmq"

import type {
    ReconcileBalanceJobData 
} from "./data"

/** Params for reconcile-balance processing (shared across phases). */
export interface ProcessParams {
    /** Raw BullMQ job object (queue metadata, attempts, progress, etc.). */
    bullmqJob: Job<string>

    /** Persisted job document (used for status transitions + metadata). */
    job: JobSchema

    /** Persisted bot document (holds tokens/chain config and active job state). */
    bot: BotSchema

    /** Deserialized reconcile-balance payload (botId/jobId + optional balances). */
    payload: ReconcileBalancePayload
}

/** Result of reconcile-balance phase processing. */
export interface ProcessResult {
    data: Partial<ReconcileBalanceJobData>
}
