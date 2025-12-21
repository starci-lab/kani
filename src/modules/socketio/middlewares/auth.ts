import { verify, TokenExpiredError } from "jsonwebtoken"
import { envConfig } from "@modules/env"
import { TypedSocket } from "../types"
import { JwtAccessTokenPayload } from "@modules/passport"
import { 
    SocketIoAccessTokenMissingException,
    SocketIoAccessTokenInvalidException,
    SocketIoAccessTokenExpiredException
} from "@exceptions"
import { getJwtSecretKey } from "@modules/filesystem"
import crypto from "crypto"

export const socketIoAuthMiddleware = (
    socket: TypedSocket, 
    next: (err?: Error) => void
) => async () => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token
        if (!token) {
            return next(new SocketIoAccessTokenMissingException())
        }
        // we should use the mount filesystem service to get the jwt secret key
        const jwtSecret = getJwtSecretKey()
        const payload = verify(
            token, 
            jwtSecret
        ) as JwtAccessTokenPayload
        socket.data.userId = payload.id
        return next()

    } catch (err) {
        if (err instanceof TokenExpiredError) {
            return next(new SocketIoAccessTokenExpiredException())
        }
        return next(new SocketIoAccessTokenInvalidException())
    }
}