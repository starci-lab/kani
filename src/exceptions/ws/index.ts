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

/** Thrown when WebSocket connection is aborted */
export class WsConnectionAbortedException extends AbstractException {
    constructor(message?: string) {
        super(message || "WS connection aborted", "WS_CONNECTION_ABORTED_EXCEPTION")
    }
}

/** Thrown when WebSocket connection fails after max retries */
export class WsConnectionFailedException extends AbstractException {
    constructor(maxRetries: number, message?: string) {
        super(message || `WS connection failed after ${maxRetries} retries`, "WS_CONNECTION_FAILED_EXCEPTION", { maxRetries })
    }
}

/** Thrown when WebSocket connection is closed */
export class WsConnectionClosedException extends AbstractException {
    constructor(message?: string) {
        super(message || "WS connection closed", "WS_CONNECTION_CLOSED_EXCEPTION")
    }
}

/** Thrown when WebSocket connection encounters an error */
export class WsConnectionErrorException extends AbstractException {
    constructor(message?: string) {
        super(message || "WS connection error", "WS_CONNECTION_ERROR_EXCEPTION")
    }
}
