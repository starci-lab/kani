import { Injectable } from "@nestjs/common"
import { JwtService as NestJwtService } from "@nestjs/jwt"
import { v4 as uuidv4 } from "uuid"
import { envConfig } from "@modules/env"
import { UserLike, AuthCredentials, JwtPayload } from "../types"
import { AsyncService, DayjsService } from "@modules/mixin"
import { InjectMongoose, SessionSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { CacheKey, CacheManagerService, createCacheKey } from "@modules/cache"
import { MsService } from "@modules/mixin"

@Injectable()
export class JwtAuthService {
    constructor(
        private readonly jwtService: NestJwtService,
        private readonly dayjsService: DayjsService,
        private readonly cacheManagerService: CacheManagerService,
        @InjectMongoose()
        private readonly connection: Connection,
        private readonly msService: MsService,
        private readonly asyncService: AsyncService
    ) { }

    // generate temporary access token for authentication
    public async generateTemporaryAccessToken(
        { id }: UserLike
    ): Promise<string> {
        return await this.jwtService.signAsync({ id }, {
            secret: envConfig().jwt.temporaryAccessToken.secret,
            expiresIn: envConfig().jwt.temporaryAccessToken.expiration
        })
    }

    // generate access token and refresh token for authentication
    public async generate(
        { id }: UserLike
    ): Promise<AuthCredentials> {
        if (!id) {
            throw new Error("User ID is required")
        }
        // generate sessionId
        const sessionId = uuidv4()
        // generate accessToken
        const accessToken = await this.jwtService.signAsync({ id }, {
            secret: envConfig().jwt.accessToken.secret,
            expiresIn: envConfig().jwt.accessToken.expiration
        })
        // generate refreshToken
        const refreshToken = await this.jwtService.signAsync(
            {
                // we need id to determine the user
                id,
                // we need sessionId to identify the session
                sessionId
            },
            {
                secret: envConfig().jwt.refreshToken.secret,
                expiresIn: envConfig().jwt.refreshToken.expiration
            }
        )
        // Persist sessionId and refreshToken in DB and/or cache here
        await this.asyncService.allIgnoreError([
            // Persist sessionId in DB or cache here
            (async () => {
                await this.cacheManagerService.set({ 
                    key: createCacheKey(
                        CacheKey.SessionId,
                        sessionId
                    ), 
                    value: true,
                    ttl: this.msService.fromString(
                        envConfig().jwt.refreshToken.expiration
                    ) 
                })
            })(),
            // Persist refreshToken in DB or cache here
            (async () => {
                await this.connection.model(
                    SessionSchema.name
                ).create([
                    {
                        sessionId,
                        user: id,
                        // expiresAt is the date and time when the session will expire
                        expiresAt: this.dayjsService.fromMs(
                            envConfig().jwt.refreshToken.expiration
                        ).toDate()
                    }
                ])
            })()
        ])
        return {
            accessToken,
            refreshToken
        }
    }

    // verify access token
    public async verifyAccessToken(token: string): Promise<UserLike | null> {
        try {
            return await this.jwtService.verifyAsync<UserLike>(token, {
                secret: envConfig().jwt.accessToken.secret
            })
        } catch {
            return null
        }
    }

    // verify refresh token
    public async verifyRefreshToken(
        token: string
    ): Promise<JwtPayload | null> {
        try {
            const decoded = await this.jwtService.verifyAsync<JwtPayload>(token, {
                secret: envConfig().jwt.refreshToken.secret
            })
            return {
                sessionId: decoded.sessionId,
                id: decoded.id
            }
        } catch {
            return null
        }
    }

    // decode token
    public async decodeToken(token: string): Promise<JwtPayload | null> {
        return this.jwtService.decode(token)
    }
}