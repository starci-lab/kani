import { Injectable } from "@nestjs/common"
import { JwtService as NestJwtService } from "@nestjs/jwt"
import { v4 as uuidv4 } from "uuid"
import { envConfig } from "@modules/env"
import { AuthCredentials, JwtRefreshTokenPayload, JwtAccessTokenPayload } from "../types"
import { AsyncService, DayjsService } from "@modules/mixin"
import { InjectMongoose, SessionSchema } from "@modules/databases"
import { ClientSession, Connection } from "mongoose"
import { CacheKey, CacheManagerService, createCacheKey } from "@modules/cache"
import { MsService } from "@modules/mixin"

export interface GenerateParams {
    id: string
    totpVerified: boolean
    encryptedTotpSecret?: string
    session?: ClientSession
}

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

    // generate access token and refresh token for authentication
    public async generate(
        {
            id,
            totpVerified,
            encryptedTotpSecret,
            session,
        }: GenerateParams,
    ): Promise<AuthCredentials> {
        if (!id) {
            throw new Error("User ID is required to generate access token and refresh token")
        }
        // generate sessionId
        const sessionId = uuidv4()
        // generate accessToken
        const accessToken = await this.jwtService.signAsync({ 
            // user id to determine the user
            id, 
            // whether the user has verified their TOTP
            totpVerified, 
            // encrypted TOTP secret
            encryptedTotpSecret
        }, {
            secret: envConfig().jwt.accessToken.secret,
            expiresIn: envConfig().jwt.accessToken.expiration
        })
        let refreshToken: string | undefined
        if (totpVerified) {
        // generate refreshToken
            refreshToken = await this.jwtService.signAsync(
                {
                    // we need id to determine the user
                    id,
                    // we need sessionId to identify the session
                    sessionId,
                },
                {
                    secret: envConfig().jwt.refreshToken.secret,
                    expiresIn: envConfig().jwt.refreshToken.expiration
                }
            )
        }
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
                ).insertOne(
                    {
                        sessionId,
                        user: id,
                        // expiresAt is the date and time when the session will expire
                        expiresAt: this.dayjsService.fromMs(
                            envConfig().jwt.refreshToken.expiration
                        ).toDate()
                    },
                    {
                        session
                    }
                )
            })()
        ])
        return {
            accessToken,
            refreshToken
        }
    }

    // verify access token
    public async verifyAccessToken(token: string): Promise<JwtAccessTokenPayload | null> {
        try {
            return await this.jwtService.verifyAsync<JwtAccessTokenPayload>(token, {
                secret: envConfig().jwt.accessToken.secret
            })
        } catch {
            return null
        }
    }

    // verify refresh token
    public async verifyRefreshToken(
        token: string
    ): Promise<JwtRefreshTokenPayload | null> {
        try {
            const decoded = await this.jwtService.verifyAsync<JwtRefreshTokenPayload>(token, {
                secret: envConfig().jwt.refreshToken.secret
            })
            return {
                sessionId: decoded.sessionId,
                id: decoded.id,
            }
        } catch {
            return null
        }
    }

    // decode token
    public async decodeToken<
    T extends JwtAccessTokenPayload | JwtRefreshTokenPayload
    >(token: string): Promise<T | null> {
        return this.jwtService.decode<T>(token)
    }
}

