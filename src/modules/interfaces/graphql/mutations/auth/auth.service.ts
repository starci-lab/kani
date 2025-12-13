import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    SessionSchema,
    UserSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    ConfirmTotpResponseData,
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
import { SendSignInOtpMailService } from "@modules/mail"
import { CodeGeneratorService } from "@modules/code"
import { createCacheKey, InjectRedisCache, SignInOtpCacheResult } from "@modules/cache"
import { Cache } from "cache-manager"
import { CacheKey } from "@modules/cache"
import ms from "ms"
import { CookieService } from "@modules/cookie"
import { Response } from "express"
import { TotpService } from "@modules/totp"
import { GcpKmsService } from "@modules/gcp"

@Injectable()
export class AuthService {
    constructor(
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    @InjectRedisCache()
    private readonly cacheManager: Cache,
    private readonly jwtAuthService: JwtAuthService,
    private readonly sendSignInOtpMailService: SendSignInOtpMailService,
    private readonly codeGeneratorService: CodeGeneratorService,
    private readonly cookieService: CookieService,
    private readonly totpService: TotpService,
    private readonly gcpKmsService: GcpKmsService
    ) {}

    async confirmTotp(userLike: UserJwtLike): Promise<ConfirmTotpResponseData> {
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
        if (!user.totpVerified) {
            await this.connection.model<UserSchema>(UserSchema.name).updateOne(
                {
                    id: userLike.id,
                },
                {
                    $set: {
                        totpVerified: true,
                    },
                },
            )
        }
        const { accessToken } = await this.jwtAuthService.generate({
            id: user.id,
            mfaEnabled: user.mfaEnabled,
        })
        // set the refresh token in the cookie
        return { accessToken }
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
            const encryptedTotpSecret = await this.gcpKmsService.encrypt(totpSecret.base32)
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
}
