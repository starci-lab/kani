import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    UserSchema,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    VerifySignInOtpRequest,
    VerifySignInOtpResponseData,
} from "./verify-sign-in-otp.dto"
import {
    JwtAuthService 
} from "@modules/passport"
import {
    FailedToGenerateReferralCodeException,
    SignInOtpMismatchException,
    SignInOtpNotFoundException,
} from "@modules/exceptions"
import {
    CacheKey,
    CacheService,
} from "@modules/cache"
import {
    CookieService 
} from "@modules/cookie"
import {
    Response 
} from "express"
import {
    TotpService 
} from "@modules/totp"
import {
    DerivedAesKeyService 
} from "@modules/derived"
import {
    CodeGeneratorService 
} from "@modules/code"

@Injectable()
export class VerifySignInOtpService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly cacheService: CacheService,
        private readonly jwtAuthService: JwtAuthService,
        private readonly cookieService: CookieService,
        private readonly totpService: TotpService,
        private readonly derivedAesKeyService: DerivedAesKeyService,
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
        const cachedOtp = await this.cacheService.get(
            {
                key: CacheKey.SendOtpCode,
                args: [email],
            }
        )
        if (!cachedOtp) {
            throw new SignInOtpNotFoundException({
                email,
            })
        }
        if (cachedOtp.otp !== otp) {
            throw new SignInOtpMismatchException({
                email,
            })
        }
        let referralCode: string | null = null
        let bump = 0
        while (!referralCode) {
            const code = this.codeGeneratorService.generateCode("KANI")
            const exists = await this.connection
                .model<UserSchema>(UserSchema.name)
                .exists({
                    referralCode: code 
                })

            if (!exists) {
                referralCode = code
            } else {
                bump++
                if (bump > 10) {
                    throw new FailedToGenerateReferralCodeException({
                        email,
                    })
                }
            }
        }
        // authenticate the user
        let user = (
            await this.connection
                .model<UserSchema>(UserSchema.name)
                .findOne({
                    email 
                })
        )?.toJSON()
        if (!user) {
            const totpSecret = this.totpService.generateSecret(email)
            const encryptedTotpSecretPayload = this.derivedAesKeyService.encrypt(totpSecret.base32)
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
                            {
                                session 
                            }
                        ])
                    const user = userRaw.toJSON()
                    return user
                })
        }
        const { 
            accessToken, 
            refreshToken
        } = await this.jwtAuthService.generate({
            id: user.id,
            mfaEnabled: true,
            encryptedTotpSecretPayload: user.encryptedTotpSecretPayload,
        })
        if (refreshToken) {
            this.cookieService.attachHttpOnlyCookie({
                res,
                name: "refresh_token",
                value: refreshToken,
            })
        }
        // delete the sign in OTP from cache
        await this.cacheService.del(
            {
                key: CacheKey.SendOtpCode,
                args: [email],
            }
        )
        return {
            id: user.id,
            accessToken
        }
    }
}

