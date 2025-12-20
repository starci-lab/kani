import { verify, TokenExpiredError } from "jsonwebtoken"
import { envConfig } from "@modules/env"
import { TypedSocket } from "../types"
import { JwtAccessTokenPayload } from "@modules/passport"
import { 
    SocketIoAccessTokenMissingException,
    SocketIoAccessTokenInvalidException,
    SocketIoAccessTokenExpiredException
} from "@exceptions"
import { promises as fs } from "fs"
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
        const jwtSecret = await fs.readFile(
            envConfig().mountPath.keys.jwtSecret,
            "utf8"
        )
        // we should use the crypto service to hash the jwt secret key
        const keyBuffer = crypto.pbkdf2Sync(
            jwtSecret,                 // base key
            envConfig().salt.jwt,   // salt
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