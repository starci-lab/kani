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
    SignInOtpMismatchException,
    SignInOtpNotFoundException,
} from "@exceptions"
import { createCacheKey, InjectRedisCache, SignInOtpCacheResult } from "@modules/cache"
import { Cache } from "cache-manager"
import { CacheKey } from "@modules/cache"
import { CookieService } from "@modules/cookie"
import { Response } from "express"
import { TotpService } from "@modules/totp"
import { EncryptionService } from "@modules/crypto"
import { envConfig } from "@modules/env"

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
        private readonly encryptionService: EncryptionService,
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
        // authenticate the user
        let user = (
            await this.connection
                .model<UserSchema>(UserSchema.name)
                .findOne({ email })
        )?.toJSON()
        if (!user) {
            const totpSecret = this.totpService.generateSecret()
            const encryptedTotpSecret = await this.encryptionService.encrypt(totpSecret.base32)
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
                                encryptedTotpSecret,
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

