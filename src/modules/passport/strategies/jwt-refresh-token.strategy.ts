import {
    Injectable 
} from "@nestjs/common"
import {
    Strategy 
} from "passport-custom"
import {
    UserJwtLike 
} from "../types"
import {
    Request 
} from "express"
import {
    PassportStrategy 
} from "@nestjs/passport"
import {
    ExtractJwt 
} from "passport-jwt"
import {
    InvalidAuthenticationTokenException, NoAuthenticationTokenException 
} from "@modules/exceptions"
import {
    JwtAuthService 
} from "../jwt"

export const JWT_REFRESH_TOKEN_STRATEGY = "jwt-refresh-token"

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
    Strategy, 
    JWT_REFRESH_TOKEN_STRATEGY
) {
    constructor(
        private readonly jwtAuthService: JwtAuthService,
    ) {
        super()
    }

    async authenticate(req: Request) {
        const extractor = ExtractJwt.fromHeader("refresh_token")
        const token = extractor(req)
        if (!token) return this.fail(new NoAuthenticationTokenException({
        }),
        401)
        const payload = await this.jwtAuthService.verifyRefreshToken(token)
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