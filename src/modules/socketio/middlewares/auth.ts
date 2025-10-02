import { verify, TokenExpiredError } from "jsonwebtoken"
import { envConfig } from "@modules/env"
import { TypedSocket } from "../types"
import { JwtAccessTokenPayload } from "@modules/passport"
import { 
    SocketIoAccessTokenMissingException, 
    SocketIoAccessTokenNotVerifiedException, 
    SocketIoAccessTokenInvalidException,
    SocketIoAccessTokenExpiredException
} from "@modules/errors"

export const socketIoAuthMiddleware = (
    socket: TypedSocket, 
    next: (err?: Error) => void
) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token
        if (!token) {
            return next(new SocketIoAccessTokenMissingException())
        }

        const payload = verify(
            token, 
            envConfig().jwt.accessToken.secret
        ) as JwtAccessTokenPayload

        if (!payload.totpVerified) {
            return next(new SocketIoAccessTokenNotVerifiedException())
        }

        socket.data.userId = payload.id
        return next()

    } catch (err) {
        if (err instanceof TokenExpiredError) {
            return next(new SocketIoAccessTokenExpiredException())
        }
        return next(new SocketIoAccessTokenInvalidException())
    }
}