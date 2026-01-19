import {
    Injectable 
} from "@nestjs/common"
import {
    JwtService as NestJwtService 
} from "@nestjs/jwt"
import {
    v4 as uuidv4 
} from "uuid"
import {
    envConfig 
} from "@modules/env"
import {
    AuthCredentials, JwtRefreshTokenPayload, JwtAccessTokenPayload 
} from "../types"
import {
    AsyncService 
} from "@modules/mixin"
import {
    UserIdRequiredToGenerateAccessTokenException 
} from "@modules/exceptions"
import {
    EncryptedPayload 
} from "@modules/typedefs"
import {
    DerivedJwtSecretService 
} from "@modules/derived"
import {
    CacheService, CacheKey
} from "@modules/cache"

export interface GenerateParams {
    id: string
    mfaEnabled: boolean
    encryptedTotpSecretPayload?: EncryptedPayload
}

@Injectable()
export class JwtAuthService {
    constructor(
        private readonly jwtService: NestJwtService,
        private readonly cacheService: CacheService,
        private readonly asyncService: AsyncService,
        private readonly derivedJwtSecretService: DerivedJwtSecretService
    ) { }

    public getJwtSecretKey(): Buffer {
        return this.derivedJwtSecretService.key
    }

    // generate access token and refresh token for authentication
    public async generate(
        {
            id,
            mfaEnabled,
            encryptedTotpSecretPayload,
        }: GenerateParams,
    ): Promise<AuthCredentials> {
        if (!id) {
            throw new UserIdRequiredToGenerateAccessTokenException(
                {
                }
            )
        }
        // generate sessionId
        const sessionId = uuidv4()
        // generate accessToken
        const accessToken = await this.jwtService.signAsync({ 
            // user id to determine the user
            id, 
            // whether the user has verified their TOTP
            mfaEnabled, 
            // encrypted TOTP secret for 2FA if user has enabled two-factor authentication
            encryptedTotpSecretPayload,
        },
        {
            secret: this.derivedJwtSecretService.key,
            expiresIn: envConfig().jwt.accessToken.expiration
        })
        let refreshToken: string | undefined
        if (mfaEnabled) {
            // generate refreshToken
            refreshToken = await this.jwtService.signAsync(
                {
                    // we need id to determine the user
                    id,
                    // we need sessionId to identify the session
                    sessionId,
                    // encrypted TOTP secret for 2FA if user has enabled two-factor authentication
                    encryptedTotpSecretPayload,
                },
                {
                    secret: this.derivedJwtSecretService.key,
                    expiresIn: envConfig().jwt.refreshToken.expiration
                }
            )
        }
        // Persist sessionId and refreshToken in cache here
        await this.asyncService.allIgnoreError([
            // Persist sessionId in cache here
            (async () => {
                await this.cacheService.set(
                    {
                        key: CacheKey.SessionId,
                        args: [sessionId],
                        cacheResult: true,
                    })
            })(),
        ])
        return {
            accessToken,
            refreshToken
        }
    }

    // verify access token
    public async verifyAccessToken(token: string): Promise<JwtAccessTokenPayload | null> {
        try {
            return await this.jwtService.verifyAsync<JwtAccessTokenPayload>(token,
                {
                    secret: this.derivedJwtSecretService.key,
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
            const decoded = await this.jwtService.verifyAsync<JwtRefreshTokenPayload>(token,
                {
                    secret: this.derivedJwtSecretService.key,
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

