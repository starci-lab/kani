/**
 * Session Exceptions
 * Errors related to user sessions
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"

/** Thrown when session cannot be found */
export interface SessionNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    sessionId: string
}

export class SessionNotFoundException extends AbstractException {
    constructor(
        {
            sessionId,
            originalError,
        }: SessionNotFoundExceptionMetadata
    ) {
        super(
            "Session not found",
            "SESSION_NOT_FOUND_EXCEPTION",
            {
                sessionId,
                originalError,
            }
        )
    }
}
