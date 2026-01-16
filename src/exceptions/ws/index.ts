/**
 * WebSocket Exceptions
 * Errors related to WebSocket connections
 */

import { AbstractException } from "../abstract"

/** Thrown when WebSocket retry limit is reached */
export class WsRetryLimitReachedException extends AbstractException {
    constructor(times: number, message?: string) {
        super(message || `WS retry limit reached: ${times} times`, "WS_RETRY_LIMIT_REACHED_EXCEPTION", { times })
    }
}

/** Thrown when stream connection is aborted */
export class StreamConnectionAbortedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Stream connection aborted", "STREAM_CONNECTION_ABORTED_EXCEPTION")
    }
}

/** @deprecated Use StreamConnectionAbortedException instead */
export class WsConnectionAbortedException extends StreamConnectionAbortedException {
    constructor(message?: string) {
        super(message || "WS connection aborted")
    }
}

/** Thrown when WebSocket connection fails after max retries */
export class WsConnectionFailedException extends AbstractException {
    constructor(maxRetries: number, message?: string) {
        super(message || `WS connection failed after ${maxRetries} retries`, "WS_CONNECTION_FAILED_EXCEPTION", { maxRetries })
    }
}

/** Thrown when stream connection is closed */
export class StreamConnectionClosedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Stream connection closed", "STREAM_CONNECTION_CLOSED_EXCEPTION")
    }
}

/** @deprecated Use StreamConnectionClosedException instead */
export class WsConnectionClosedException extends StreamConnectionClosedException {
    constructor(message?: string) {
        super(message || "WS connection closed")
    }
}

/** Thrown when WebSocket connection encounters an error */
export class WsConnectionErrorException extends AbstractException {
    constructor(message?: string) {
        super(message || "WS connection error", "WS_CONNECTION_ERROR_EXCEPTION")
    }
}

/** Thrown when WebSocket connection times out */
export class WsConnectionTimeoutException extends AbstractException {
    constructor(message?: string) {
        super(message || "WS connection timed out", "WS_CONNECTION_TIMEOUT_EXCEPTION")
    }
}