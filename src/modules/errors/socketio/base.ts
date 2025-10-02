export class SocketIoAccessTokenMissingException extends Error {
    constructor(message?: string) {
        super(message || "SOCKET_IO_ACCESS_TOKEN_MISSING_EXCEPTION")
        this.name = "SOCKET_IO_ACCESS_TOKEN_MISSING_EXCEPTION"
    }
}

export class SocketIoAccessTokenInvalidException extends Error {
    constructor(message?: string) {
        super(message || "SOCKET_IO_ACCESS_TOKEN_INVALID_EXCEPTION")
        this.name = "SOCKET_IO_ACCESS_TOKEN_INVALID_EXCEPTION"
    }
}

export class SocketIoAccessTokenExpiredException extends Error {
    constructor(message?: string) {
        super(message || "SOCKET_IO_ACCESS_TOKEN_EXPIRED_EXCEPTION")
        this.name = "SOCKET_IO_ACCESS_TOKEN_EXPIRED_EXCEPTION"
    }
}

export class SocketIoAccessTokenNotVerifiedException extends Error {
    constructor(message?: string) {
        super(message || "SOCKET_IO_ACCESS_TOKEN_NOT_VERIFIED_EXCEPTION")
        this.name = "SOCKET_IO_ACCESS_TOKEN_NOT_VERIFIED_EXCEPTION"
    }
}