import {
    Injectable 
} from "@nestjs/common"
import {
    PassportStrategy 
} from "@nestjs/passport"
import {
    Strategy 
} from "passport-custom"
import {
    UserJwtLike 
} from "../types"
import { 
    InvalidAuthenticationTokenException, 
    NoAuthenticationTokenException, 
    UserHasNotCompletedMFAAuthenticationException 
} from "@modules/exceptions"
import {
    JwtAuthService 
} from "../jwt"
import {
    Request 
} from "express"
import {
    ExtractJwt 
} from "passport-jwt"

export const JWT_ACCESS_TOKEN_STRATEGY = "jwt-access-token"
@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(
    Strategy, 
    JWT_ACCESS_TOKEN_STRATEGY
) {
    constructor(
        private readonly jwtAuthService: JwtAuthService
    ) {
        super()
    }

    async authenticate(req: Request) {
        const extractor = ExtractJwt.fromAuthHeaderAsBearerToken()
        const token = extractor(req)
        if (!token) return this.fail(new NoAuthenticationTokenException({
        }),
        401)
        const payload = await this.jwtAuthService.verifyAccessToken(token)
        if (!payload) return this.fail(new InvalidAuthenticationTokenException({
            token,
        }),
        401)
        return this.success(payload)
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
        private readonly jwtAuthService: JwtAuthService
    ) {
        super()
    }

    async authenticate(req: Request) {
        const extractor = ExtractJwt.fromAuthHeaderAsBearerToken()
        const token = extractor(req)
        if (!token) return this.fail(new NoAuthenticationTokenException({
            originalError: new Error("No authentication token provided")
        }),
        401)
        const payload = await this.jwtAuthService.verifyAccessToken(token)
        if (!payload) return this.fail(new InvalidAuthenticationTokenException({
            token,
            originalError: new Error("Invalid authentication token")
        }),
        401)
        return this.success(payload)
    }

    validate(payload: UserJwtLike) {
        if (!payload.mfaEnabled) {
            // You can also throw UnauthorizedException here, but Forbidden is clearer for "logged in but not verified"
            throw new UserHasNotCompletedMFAAuthenticationException({
            })
        }
        return payload
    }
}