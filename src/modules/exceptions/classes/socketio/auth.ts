/**
 * Socket.IO Exceptions
 * Errors related to Socket.IO connections and authentication.
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when Socket.IO access token is missing */
export type SocketIoAccessTokenMissingExceptionMetadata = AbstractExceptionMetadata
export class SocketIoAccessTokenMissingException extends AbstractException {
    constructor(
        { originalError }: SocketIoAccessTokenMissingExceptionMetadata
    ) {
        super(
            "Socket io access token missing",
            "SOCKET_IO_ACCESS_TOKEN_MISSING_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

/** Thrown when Socket.IO access token is invalid */
export type SocketIoAccessTokenInvalidExceptionMetadata = AbstractExceptionMetadata
export class SocketIoAccessTokenInvalidException extends AbstractException {
    constructor(
        { originalError }: SocketIoAccessTokenInvalidExceptionMetadata
    ) {
        super(
            "Socket io access token invalid",
            "SOCKET_IO_ACCESS_TOKEN_INVALID_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

/** Thrown when Socket.IO access token has expired */
export interface SocketIoAccessTokenExpiredExceptionMetadata extends AbstractExceptionMetadata {
    token: string
}

/** Thrown when Socket.IO access token is expired. */
export class SocketIoAccessTokenExpiredException extends AbstractException {
    constructor(
        { token, originalError }: SocketIoAccessTokenExpiredExceptionMetadata
    ) {
        super(
            "Socket.IO access token expired",
            "SOCKET_IO_ACCESS_TOKEN_EXPIRED_EXCEPTION",
            {
                token,
                originalError,
            }
        )
    }
}

