import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Metadata when heartbeat times out. */
export interface HeartbeatTimeoutExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/** Thrown when heartbeat times out. */
export class HeartbeatTimeoutException extends AbstractException {
    constructor(
        {
            botId,
            jobId,
            bullmqJobId,
            originalError,
        }: HeartbeatTimeoutExceptionMetadata,
    ) {
        super(
            "Heartbeat timeout",
            "HEARTBEAT_TIMEOUT",
            {
                botId, jobId, bullmqJobId, originalError 
            }
        )
    }
}
