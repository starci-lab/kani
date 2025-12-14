import { verify, TokenExpiredError } from "jsonwebtoken"
import { envConfig } from "@modules/env"
import { TypedSocket } from "../types"
import { JwtAccessTokenPayload } from "@modules/passport"
import { 
    SocketIoAccessTokenMissingException,
    SocketIoAccessTokenInvalidException,
    SocketIoAccessTokenExpiredException
} from "@modules/errors"
import fs from "fs"
import crypto from "crypto"

export const socketIoAuthMiddleware = (
    socket: TypedSocket, 
    next: (err?: Error) => void
) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token
        if (!token) {
            return next(new SocketIoAccessTokenMissingException())
        }
        const keyRaw = fs.readFileSync(
            envConfig().mountPath.keys.jwtSecret, 
            "utf8"
        )
        const keyBuffer = crypto.pbkdf2Sync(
            keyRaw,                 // base key
            envConfig().salt.jwt,// salt
            100_000,                // number of hash rounds
            32,                     // length of key (bytes)
            "sha256"                // hash function
        )
        const secret = keyBuffer.toString("hex")
        const payload = verify(
            token, 
            secret
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