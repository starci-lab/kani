import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { UserJwtLike } from "../types"
import { UserHasNotCompletedMFAAuthenticationException } from "@exceptions"
import { getJwtSecretKey } from "@modules/filesystem"

export const JWT_ACCESS_TOKEN_STRATEGY = "jwt-access-token"
@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(
    Strategy, 
    JWT_ACCESS_TOKEN_STRATEGY
) {
    constructor(
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: getJwtSecretKey(),
        })
    }

    validate(payload: UserJwtLike) {
        return payload
    }
}

export const JWT_ACCESS_TOKEN_ONLY_MFA_ENABLED_STRATEGY = "jwt-access-token-only-mfa-enabled"
@Injectable()
export class JwtAccessTokenOnlyMFAEnabledStrategy extends PassportStrategy(
    Strategy, 
    JWT_ACCESS_TOKEN_ONLY_MFA_ENABLED_STRATEGY
) {
    constructor(
    ) {
        super(
            {
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                ignoreExpiration: false,
                secretOrKey: getJwtSecretKey(),
            }
        )
    }

    validate(payload: UserJwtLike) {
        if (!payload.mfaEnabled) {
            // You can also throw UnauthorizedException here, but Forbidden is clearer for "logged in but not verified"
            throw new UserHasNotCompletedMFAAuthenticationException("User has not completed MFA authentication")
        }
        return payload
    }
}