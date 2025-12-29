/**
 * Socket.IO Exceptions
 * Errors related to Socket.IO connections and authentication
 */

import { AbstractException } from "../abstract"

/** Thrown when Socket.IO access token is missing */
export class SocketIoAccessTokenMissingException extends AbstractException {
    constructor(message?: string) {
        super(message || "Socket io access token missing", "SOCKET_IO_ACCESS_TOKEN_MISSING_EXCEPTION")
    }
}

/** Thrown when Socket.IO access token is invalid */
export class SocketIoAccessTokenInvalidException extends AbstractException {
    constructor(message?: string) {
        super(message || "Socket io access token invalid", "SOCKET_IO_ACCESS_TOKEN_INVALID_EXCEPTION")
    }
}

/** Thrown when Socket.IO access token has expired */
export class SocketIoAccessTokenExpiredException extends AbstractException {
    constructor(message?: string) {
        super(message || "Socket io access token expired", "SOCKET_IO_ACCESS_TOKEN_EXPIRED_EXCEPTION")
    }
}
