import {
    verify, TokenExpiredError 
} from "jsonwebtoken"
import {
    TypedSocket 
} from "../types"
import {
    JwtAccessTokenPayload 
} from "@modules/passport"
import { 
    SocketIoAccessTokenMissingException,
    SocketIoAccessTokenInvalidException,
    SocketIoAccessTokenExpiredException
} from "@modules/exceptions"
import {
    DerivedJwtSecretService 
} from "@modules/derived"

export const socketIoAuthMiddleware = (
    socket: TypedSocket, 
    next: (err?: Error) => void
) => {
    let token: string | undefined
    try {
        token = socket.handshake.auth?.token || socket.handshake.query?.token
        if (!token) {
            return next(new SocketIoAccessTokenMissingException({

            }))
        }
        // get the derived jwt secret service from the app
        const derivedJwtSecretService = globalThis.__APP__.get(DerivedJwtSecretService,
            {
                strict: false 
            })
        const jwtSecret = derivedJwtSecretService.key
        const payload = verify(
            token, 
            jwtSecret
        ) as JwtAccessTokenPayload
        socket.data.userId = payload.id
        return next()
    } catch (err) {
        if (err instanceof TokenExpiredError) {
            return next(new SocketIoAccessTokenExpiredException(    {
                originalError: err,
                token: token || "",
            }))
        }
        return next(new SocketIoAccessTokenInvalidException(    {
            originalError: err,
        }))
    }
}