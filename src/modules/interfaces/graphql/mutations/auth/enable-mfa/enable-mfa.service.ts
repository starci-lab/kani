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
    EnableMFAResponseData 
} from "./enable-mfa.dto"
import {
    JwtAuthService, UserJwtLike 
} from "@modules/passport"
import {
    UserNotFoundException,
    UserTotpSecretNotFoundException,
} from "@modules/exceptions"
import {
    CookieService 
} from "@modules/cookie"
import {
    Response 
} from "express"

@Injectable()
export class EnableMFAService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly jwtAuthService: JwtAuthService,
        private readonly cookieService: CookieService,
    ) {}

    async enableMFA(
        res: Response,
        userLike: UserJwtLike
    ): Promise<EnableMFAResponseData> {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findById(userLike.id)
        if (!user) {
            throw new UserNotFoundException({
                userId: userLike.id,
            })
        }
        if (!user.encryptedTotpSecretPayload) {
            throw new UserTotpSecretNotFoundException({
                userId: user.id,
            })
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
                    encryptedTotpSecretPayload: user.encryptedTotpSecretPayload,
                })
                // set the refresh token in the cookie
                if (refreshToken) {
                    this.cookieService.attachHttpOnlyCookie(res,
                        "refresh_token",
                        refreshToken)
                }
                return {
                    accessToken 
                }
            })
    }
}

