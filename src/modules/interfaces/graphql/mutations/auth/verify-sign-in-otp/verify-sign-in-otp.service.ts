import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    UserSchema,
    ExecutorSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    VerifySignInOtpRequest,
    VerifySignInOtpResponseData,
} from "./verify-sign-in-otp.dto"
import { JwtAuthService } from "@modules/passport"
import {
    FailedToGenerateReferralCodeException,
    SignInOtpMismatchException,
    SignInOtpNotFoundException,
} from "@exceptions"
import { createCacheKey, InjectRedisCache, SignInOtpCacheResult } from "@modules/cache"
import { Cache } from "cache-manager"
import { CacheKey } from "@modules/cache"
import { CookieService } from "@modules/cookie"
import { Response } from "express"
import { TotpService } from "@modules/totp"
import { envConfig } from "@modules/env"
import { SealedAesService } from "@modules/sealed"
import { CodeGeneratorService } from "@modules/code"

@Injectable()
export class VerifySignInOtpService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        private readonly jwtAuthService: JwtAuthService,
        private readonly cookieService: CookieService,
        private readonly totpService: TotpService,
        private readonly sealedAesService: SealedAesService,
        private readonly codeGeneratorService: CodeGeneratorService
    ) {}

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
        let referralCode: string | null = null
        let bump = 0
        while (!referralCode) {
            const code = this.codeGeneratorService.generateCode("KANI")
            const exists = await this.connection
                .model<UserSchema>(UserSchema.name)
                .exists({ referralCode: code })

            if (!exists) {
                referralCode = code
            } else {
                bump++
                if (bump > 10) {
                    throw new FailedToGenerateReferralCodeException("Failed to generate referral code after 10 attempts")
                }
            }
        }
        // authenticate the user
        let user = (
            await this.connection
                .model<UserSchema>(UserSchema.name)
                .findOne({ email })
        )?.toJSON()
        if (!user) {
            const totpSecret = this.totpService.generateSecret()
            console.log("totpSecret", totpSecret.base32)
            const encryptedTotpSecretPayload = this.sealedAesService.encrypt(totpSecret.base32)
            // we try to find an executor with less than envConfig.executorMaxCapacity users
            const executor = await this.connection
                .model<ExecutorSchema>(ExecutorSchema.name)
                .findOne({ userCount: { $lt: envConfig().capacity.executor.maxUsers } })
                .sort({ userCount: 1 })
            const session = await this.connection.startSession()
            user = await session.withTransaction(
                async () => {
                    // we create a new user
                    const [userRaw] = await this
                        .connection
                        .model<UserSchema>(UserSchema.name)
                        .create([
                            {
                                email,
                                mfaEnabled: false,
                                encryptedTotpSecretPayload,
                                referralCode
                            }, 
                            { session }
                        ])
                    const user = userRaw.toJSON()
                    if (!executor) {
                        await this.connection
                            .model<ExecutorSchema>(ExecutorSchema.name)
                            .create(
                                [
                                    {
                                        assignedUsers: 
                                        [
                                            { 
                                                userId: user.id 
                                            }
                                        ],
                                        userCount: 1,
                                    }
                                ], { session })
                    } else {
                        await this.connection
                            .model<ExecutorSchema>(ExecutorSchema.name)
                            .updateOne(
                                { _id: executor.id },
                                { 
                                    $push: { 
                                        assignedUsers: 
                                        { 
                                            userId: user.id 
                                        } 
                                    }, 
                                    $inc: { userCount: 1 } 
                                },
                                { session }
                            )
                    }
                    return user
                })
        }
        const { 
            accessToken, 
            refreshToken
        } = await this.jwtAuthService.generate({
            id: user.id,
            mfaEnabled: user.mfaEnabled,
            encryptedTotpSecretPayload: user.encryptedTotpSecretPayload,
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

