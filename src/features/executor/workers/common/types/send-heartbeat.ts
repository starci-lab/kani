import type {
    Job,
} from "bullmq"
import type {
    BotSchema,
    JobSchema,
} from "@modules/databases"

/** Params for send-heartbeat processing. */
export interface SendHeartbeatParams {
    job: JobSchema
    bot: BotSchema
    bullmqJob: Job<string>
}
