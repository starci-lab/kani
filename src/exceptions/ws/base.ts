import { AbstractException } from "../abstract"

export class WsRetryLimitReachedException extends AbstractException {
    constructor(times: number, message?: string) {
        super(message || `WS retry limit reached: ${times} times`, "WS_RETRY_LIMIT_REACHED_EXCEPTION", { times })
    }
}

export class WsConnectionAbortedException extends AbstractException {
    constructor(message?: string) {
        super(message || "WS connection aborted", "WS_CONNECTION_ABORTED_EXCEPTION")
    }
}

export class WsConnectionFailedException extends AbstractException {
    constructor(maxRetries: number, message?: string) {
        super(message || `WS connection failed after ${maxRetries} retries`, "WS_CONNECTION_FAILED_EXCEPTION", { maxRetries })
    }
}

export class WsConnectionClosedException extends AbstractException {
    constructor(message?: string) {
        super(message || "WS connection closed", "WS_CONNECTION_CLOSED_EXCEPTION")
    }
}

export class WsConnectionErrorException extends AbstractException {
    constructor(message?: string) {
        super(message || "WS connection error", "WS_CONNECTION_ERROR_EXCEPTION")
    }
}

