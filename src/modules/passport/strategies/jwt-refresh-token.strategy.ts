import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { Strategy } from "passport-jwt"
import { UserJwtLike } from "../types"
import { Request } from "express"
import { getJwtSecretKey } from "@modules/filesystem"

export const JWT_REFRESH_TOKEN_STRATEGY = "jwt-refresh-token"

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
    Strategy, 
    JWT_REFRESH_TOKEN_STRATEGY
) {
    constructor(
    ) {
        super({
            jwtFromRequest: (req: Request) => {
                // get refreshToken from HTTP-only cookie
                return req?.cookies?.refresh_token || null
            },
            ignoreExpiration: false,
            secretOrKey: getJwtSecretKey(),
        })
    }

    validate(payload: UserJwtLike) {
        return payload
    }
}