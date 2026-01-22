import {
    AbstractException, AbstractExceptionMetadata 
} from "@exceptions"

/**
 * Heartbeat timeout exception
 */
export interface HeartbeatTimeoutExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    jobId: string
    bullmqJobId?: string
}

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
