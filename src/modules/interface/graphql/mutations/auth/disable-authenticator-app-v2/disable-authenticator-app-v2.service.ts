import {
    Injectable,
} from "@nestjs/common"
import {
    AuthenticationFactor,
    InjectPrimaryMongoose,
    UserSchema,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    DisableAuthenticatorAppV2Request
} from "./disable-authenticator-app-v2.dto"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    UserAuthenticatorAppNotEnabledException,
    InvalidTOTPCodeException,
    UserNotFoundException,
    UserTotpSecretNotFoundException,
} from "@modules/exceptions"
import {
    TotpService 
} from "@modules/totp"
import {
    DerivedAesKeyService 
} from "@modules/derived"

@Injectable()
export class DisableAuthenticatorAppV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly totpService: TotpService,
        private readonly derivedAesKeyService: DerivedAesKeyService,
    ) {}

    async disableAuthenticatorAppV2(
        response: VerifyAccessTokenResponse,
        { totpCode }: DisableAuthenticatorAppV2Request
    ) {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({
                privyUserId: response.user_id 
            })
        if (!user) {
            throw new UserNotFoundException({
                privyUserId: response.user_id,
            })
        }
        if (!user.authenticationFactors?.includes(AuthenticationFactor.TOTP)) {
            throw new UserAuthenticatorAppNotEnabledException({
                id: user.id,
            })
        }
        if (!user.encryptedTotpSecretPayload) {
            throw new UserTotpSecretNotFoundException({
                id: user.id,
            })
        }
        // Verify TOTP code
        const decryptedTotpSecret = this.derivedAesKeyService.decrypt(user.encryptedTotpSecretPayload)
        const verified = this.totpService.verifyTotp(totpCode,
            decryptedTotpSecret)
        if (!verified) {
            throw new InvalidTOTPCodeException({
                id: user.id,
            })
        }
        const session = await this.connection.startSession()
        return await session.withTransaction(
            async () => {
                await this.connection.model<UserSchema>(UserSchema.name).updateOne(
                    {
                        _id: user.id,
                    },
                    {
                        $unset: {
                            encryptedTotpSecretPayload: 1,
                        },
                        $pull: {
                            authenticationFactors: AuthenticationFactor.TOTP,
                        },
                    },
                )
            }
        )
    }
}
