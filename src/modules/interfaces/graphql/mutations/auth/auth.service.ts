import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    SessionSchema,
    UserSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    EnableMFAResponseData,
    RefreshResponseData,
    RequestSignInOtpRequest,
    VerifySignInOtpRequest,
    VerifySignInOtpResponseData,
} from "./auth.dto"
import { JwtAuthService, UserJwtLike } from "@modules/passport"
import {
    SessionNotFoundException,
    SignInOtpMismatchException,
    SignInOtpNotFoundException,
    UserNotFoundException,
    UserTotpSecretNotFoundException,
} from "@exceptions"
import { SendSignInOtpMailService, Send2FactorOtpMailService } from "@modules/mail"
import { CodeGeneratorService } from "@modules/code"
import { createCacheKey, InjectRedisCache, SignInOtpCacheResult } from "@modules/cache"
import { Cache } from "cache-manager"
import { CacheKey } from "@modules/cache"
import ms from "ms"
import { CookieService } from "@modules/cookie"
import { Response } from "express"
import { TotpService } from "@modules/totp"
import { EncryptionService } from "@modules/crypto"
import SuperJSON from "superjson"
import { InjectSuperJson } from "@modules/mixin"

@Injectable()
export class AuthService {
    constructor(
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    @InjectRedisCache()
    private readonly cacheManager: Cache,
    private readonly jwtAuthService: JwtAuthService,
    private readonly sendSignInOtpMailService: SendSignInOtpMailService,
    private readonly send2FactorOtpMailService: Send2FactorOtpMailService,
    private readonly codeGeneratorService: CodeGeneratorService,
    private readonly cookieService: CookieService,
    private readonly totpService: TotpService,
    private readonly encryptionService: EncryptionService,
    @InjectSuperJson()
    private readonly superJson: SuperJSON,
    ) {}

    async enableMFA(
        res: Response,
        userLike: UserJwtLike
    ): Promise<EnableMFAResponseData> {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findById(userLike.id)
        if (!user) {
            throw new UserNotFoundException()
        }
        if (!user.encryptedTotpSecret) {
            throw new UserTotpSecretNotFoundException("User totp secret not found")
        }
        // if the user not verified, set the totpVerified to true
        const session = await this.connection.startSession()
        return await session.withTransaction(
            async () => {
                if (!user.mfaEnabled) {
                    await this.connection.model<UserSchema>(UserSchema.name).updateOne(
                        {
                            _id: userLike.id,
                        },
                        {
                            $set: {
                                mfaEnabled: true,
                            },
                        },
                    )
                }
                const { 
                    accessToken, 
                    refreshToken
                } = await this.jwtAuthService.generate({
                    id: user.id,
                    mfaEnabled: user.mfaEnabled,
                    encryptedTotpSecret: user.encryptedTotpSecret,
                })
                // set the refresh token in the cookie
                if (refreshToken) {
                    this.cookieService.attachHttpOnlyCookie(res, "refresh_token", refreshToken)
                }
                return { accessToken }
            })
    }

    async refresh(userLike: UserJwtLike): Promise<RefreshResponseData> {
    // try first in cache
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findById(userLike.id)
        if (!user) {
            throw new UserNotFoundException("User not found")
        }
        // if not found, try in database
        if (!user.encryptedTotpSecret) {
            throw new UserTotpSecretNotFoundException("User totp secret not found")
        }
        const sessionExists = await this.connection
            .model<SessionSchema>(SessionSchema.name)
            .exists({ user: userLike.id })
        if (!sessionExists) {
            throw new SessionNotFoundException("Session not found")
        }
        return this.jwtAuthService.generate({
            id: user.id,
            mfaEnabled: user.mfaEnabled,
        })
    }

    async requestSignInOtp(
        {
            email,
        }: RequestSignInOtpRequest
    ): Promise<void> {
        const otp = this.codeGeneratorService.generateOtpCode()
        await this.cacheManager.set<SignInOtpCacheResult>(
            createCacheKey(CacheKey.SignInOtpCode, email),
            {
                otp,
            },
            // temporatory hardcoded to 10 minutes
            ms("10m"),
        )
        await this.sendSignInOtpMailService.send({
            email,
            otp,
        })
    }

    async verifySignInOtp(
        {
            email,
            otp,
        }: VerifySignInOtpRequest,
        res: Response,
    ): Promise<VerifySignInOtpResponseData> 
    {
        const cachedOtp = await this.cacheManager.get<SignInOtpCacheResult>(
            createCacheKey(CacheKey.SignInOtpCode, email),
        )
        if (!cachedOtp) {
            throw new SignInOtpNotFoundException("Sign in OTP not found")
        }
        if (cachedOtp.otp !== otp) {
            throw new SignInOtpMismatchException("Sign in OTP mismatch")
        }
        // authenticate the user
        let user = (
            await this.connection
                .model<UserSchema>(UserSchema.name)
                .findOne({ email })
        )?.toJSON()
        if (!user) {
            const totpSecret = this.totpService.generateSecret()
            const encryptedTotpSecret = this.encryptionService.encrypt(totpSecret.base32)
            // we create a new user
            const [userRaw] = await this
                .connection
                .model<UserSchema>(UserSchema.name)
                .create([
                    {
                        email,
                        mfaEnabled: false,
                        encryptedTotpSecret,
                    }
                ])
            user = userRaw.toJSON()
        }
        const { 
            accessToken, 
            refreshToken
        } = await this.jwtAuthService.generate({
            id: user.id,
            mfaEnabled: user.mfaEnabled,
            encryptedTotpSecret: user.encryptedTotpSecret,
        })
        if (refreshToken) {
            this.cookieService.attachHttpOnlyCookie(res, "refresh_token", refreshToken)
        }
        // delete the sign in OTP from cache
        await this.cacheManager.del(createCacheKey(CacheKey.SignInOtpCode, email))
        return {
            id: user.id,
            accessToken
        }
    }

    async requestSend2FactorOtp(
        userLike: UserJwtLike
    ): Promise<void> {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findById(userLike.id)
        if (!user) {
            throw new UserNotFoundException("User not found")
        }
        const otp = this.codeGeneratorService.generateOtpCode()
        await this.cacheManager.set(
            createCacheKey(CacheKey.SendOtpCode, user.id),
            this.superJson.stringify({
                otp,
            }),
            // temporatory hardcoded to 10 minutes
            ms("10m"),
        )   
        await this.send2FactorOtpMailService.send({
            email: user.email,
            otp,
        })
    }
}
