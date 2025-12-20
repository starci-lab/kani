import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { Strategy } from "passport-jwt"
import { UserJwtLike } from "../types"
import { Request } from "express"
import { JwtAuthService } from "../jwt"
import { ReadinessWatcherFactoryService } from "@modules/mixin"
import { KeyStorageService } from "@modules/filesystem"

export const JWT_REFRESH_TOKEN_STRATEGY = "jwt-refresh-token"

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
    Strategy, 
    JWT_REFRESH_TOKEN_STRATEGY
) {
    constructor(
        private readonly jwtAuthService: JwtAuthService,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService
    ) {
        super({
            jwtFromRequest: (req: Request) => {
                // get refreshToken from HTTP-only cookie
                return req?.cookies?.refresh_token || null
            },
            ignoreExpiration: false,
            secretOrKeyProvider: async () => {
                await this.readinessWatcherFactoryService.waitUntilReady(KeyStorageService.name)
                console.log("jwt refresh token strategy secret key")
                return this.jwtAuthService.getJwtSecretKey()
            },
        })
    }

    validate(payload: UserJwtLike) {
        return payload
    }
}