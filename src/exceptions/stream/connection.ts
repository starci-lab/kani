/**
 * Stream Connection Exceptions
 * Errors related to stream connection operations
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"

/** Thrown when stream connection is aborted */
export type StreamConnectionAbortedExceptionMetadata = AbstractExceptionMetadata

export class StreamConnectionAbortedException extends AbstractException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata = {
        }
    ) {
        super(
            "Stream connection aborted",
            "STREAM_CONNECTION_ABORTED_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

/** @deprecated Use StreamConnectionAbortedException instead */
export class WsConnectionAbortedException extends StreamConnectionAbortedException {
    constructor(
        {
            originalError,
        }: AbstractExceptionMetadata = {
        }
    ) {
        super(
            {
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