import { AbstractException } from "../abstract"

export class SocketIoAccessTokenMissingException extends AbstractException {
    constructor(message?: string) {
        super(message || "Socket io access token missing", "SOCKET_IO_ACCESS_TOKEN_MISSING_EXCEPTION")
    }
}

export class SocketIoAccessTokenInvalidException extends AbstractException {
    constructor(message?: string) {
        super(message || "Socket io access token invalid", "SOCKET_IO_ACCESS_TOKEN_INVALID_EXCEPTION")
    }
}

export class SocketIoAccessTokenExpiredException extends AbstractException {
    constructor(message?: string) {
        super(message || "Socket io access token expired", "SOCKET_IO_ACCESS_TOKEN_EXPIRED_EXCEPTION")
    }
}