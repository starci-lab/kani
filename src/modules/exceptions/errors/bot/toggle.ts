import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Metadata when bot running state cannot be toggled. */
export interface CannotToggleBotRunningStateExceptionMetadata extends AbstractExceptionMetadata {
    id: string
    status?: string
}

/** Thrown when bot running state cannot be toggled. */
export class CannotToggleBotRunningStateException extends AbstractException {
    constructor(
        { id, status, originalError }: CannotToggleBotRunningStateExceptionMetadata
    ) {
        super(
            "Cannot toggle bot running state",
            "CANNOT_TOGGLE_BOT_RUNNING_STATE_EXCEPTION",
            {
                id,
                status,
                originalError,
            }
        )
    }
}
