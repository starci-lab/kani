import {
    Injectable, UnauthorizedException 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    UserSchema,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    EnableMFAV2Request,
    EnableMFAV2ResponseData 
} from "./enable-mfa-v2.dto"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
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
export class EnableMFAV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly totpService: TotpService,
        private readonly derivedAesKeyService: DerivedAesKeyService,
    ) {}

    async enableMFAV2(
        response: VerifyAccessTokenResponse,
        { totpCode }: EnableMFAV2Request
    ): Promise<EnableMFAV2ResponseData> {
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
            throw new UnauthorizedException("Invalid TOTP code")
        }
        
        // Enable MFA if not already enabled
        const session = await this.connection.startSession()
        return await session.withTransaction(
            async () => {
                if (!user.mfaEnabled) {
                    await this.connection.model<UserSchema>(UserSchema.name).updateOne(
                        {
                            _id: user.id,
                        },
                        {
                            $set: {
                                mfaEnabled: true,
                            },
                        },
                    )
                }
                return {
                    mfaEnabled: true,
                }
            })
    }
}
