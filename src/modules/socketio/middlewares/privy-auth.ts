import {
    TokenExpiredError 
} from "jsonwebtoken"
import {
    TypedSocket 
} from "../types"
import { 
    SocketIoAccessTokenMissingException,
    SocketIoAccessTokenInvalidException,
    SocketIoAccessTokenExpiredException
} from "@modules/exceptions"
import {
    PRIVY_CLIENT 
} from "@modules/privy"
import {
    PrivyClient 
} from "@privy-io/node"
import {
    Connection 
} from "mongoose"
import {
    getPrimaryConnectionToken, UserSchema 
} from "@modules/databases"
import {
    INestApplication 
} from "@nestjs/common"

export const socketIoPrivyAuthMiddleware = async (
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
        const app: INestApplication = globalThis.__APP__
        const privyClient = app.get<PrivyClient>(
            PRIVY_CLIENT,
            {
                strict: false,
            }
        )
        const connection = app.get<Connection>(
            getPrimaryConnectionToken(),
            {
                strict: false,
            }
        )
        const payload = await privyClient.utils().auth().verifyAccessToken(token)
        const user = await connection.model<UserSchema>(UserSchema.name).findOne({
            privyUserId: payload.user_id,
        })
        if (!user) {
            return next(new SocketIoAccessTokenInvalidException({
            }))
        }
        const _user = user.toJSON<UserSchema>()
        socket.data.userId = _user.id
        return next()
    } catch (err) {
        if (err instanceof TokenExpiredError) {
            return next(new SocketIoAccessTokenExpiredException(    {
                originalError: err,
                token: token || "",
            }))
        }
        return next(new SocketIoAccessTokenInvalidException({
            originalError: err,
        }))
    }
}