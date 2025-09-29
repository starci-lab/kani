import { envConfig } from "@modules/env"
import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { UserJwtLike } from "../types"

export const JWT_REFRESH_TOKEN_STRATEGY = "jwt-refresh-token"
@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
    Strategy, 
    JWT_REFRESH_TOKEN_STRATEGY
) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: envConfig().jwt.refreshToken.secret,
        })
    }

    validate(payload: UserJwtLike) {
        return payload
    }
}