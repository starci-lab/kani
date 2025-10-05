import { envConfig } from "@modules/env"
import { ForbiddenException, Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { UserJwtLike } from "../types"

export const JWT_ACCESS_TOKEN_STRATEGY = "jwt-access-token"
@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(
    Strategy, 
    JWT_ACCESS_TOKEN_STRATEGY
) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: envConfig().jwt.accessToken.secret,
        })
    }

    validate(payload: UserJwtLike) {
        return payload
    }
}

export const JWT_ACCESS_TOKEN_ONLY_VERIFIED_TOTP_STRATEGY = "jwt-access-token-only-verified-totp"
@Injectable()
export class JwtAccessTokenOnlyVerifiedTOTPStrategy extends PassportStrategy(
    Strategy, 
    JWT_ACCESS_TOKEN_ONLY_VERIFIED_TOTP_STRATEGY
) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: envConfig().jwt.accessToken.secret,
        })
    }

    validate(payload: UserJwtLike) {
        if (!payload.totpVerified) {
            // You can also throw UnauthorizedException here, but Forbidden is clearer for "logged in but not verified"
            throw new ForbiddenException("User has not completed TOTP verification")
        }
        return payload
    }
}