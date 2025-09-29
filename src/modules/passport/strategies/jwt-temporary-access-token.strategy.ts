import { envConfig } from "@modules/env"
import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { UserJwtLike } from "../types"

export const JWT_TEMPORARY_ACCESS_TOKEN_STRATEGY = "jwt-temporary-access-token"
@Injectable()
export class JwtTemporaryAccessTokenStrategy extends PassportStrategy(
    Strategy, 
    JWT_TEMPORARY_ACCESS_TOKEN_STRATEGY
) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: envConfig().jwt.temporaryAccessToken.secret,
        })
    }

    validate(payload: UserJwtLike) {
        return payload
    }
}