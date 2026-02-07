/**
 * Session Exceptions
 * Errors related to user sessions
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when session cannot be found */
export interface SessionNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    userId: string
}

/** Thrown when session cannot be found. */
export class SessionNotFoundException extends AbstractException {
    constructor(
        {
            userId,
            originalError,
        }: SessionNotFoundExceptionMetadata
    ) {
        super(
            "Session not found",
            "SESSION_NOT_FOUND_EXCEPTION",
            {
                userId,
                originalError,
            }
        )
    }
}
