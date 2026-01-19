/**
 * Stream Connection Exceptions
 * Errors related to stream connection operations
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"

/** Thrown when stream connection is aborted */
export interface StreamConnectionAbortedExceptionMetadata extends AbstractExceptionMetadata {
    reason: string
}

export class StreamConnectionAbortedException extends AbstractException {
    constructor(
        {
            reason,
            originalError,
        }: StreamConnectionAbortedExceptionMetadata
    ) {
        super(
            "Stream connection aborted",
            "STREAM_CONNECTION_ABORTED_EXCEPTION",
            {
                reason,
                originalError,
            }
        )
    }
}

/** Thrown when stream connection is closed */
export type StreamConnectionClosedExceptionMetadata = AbstractExceptionMetadata

export class StreamConnectionClosedException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata = {
        }
    ) {
        super(
            "Stream connection closed",
            "STREAM_CONNECTION_CLOSED_EXCEPTION",
            {
                originalError,
            }
        )
    }
}