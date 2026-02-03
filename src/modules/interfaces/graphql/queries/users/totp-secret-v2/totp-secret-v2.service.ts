import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose, UserSchema 
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    EmailNotFoundException,
    UserMfaAlreadyEnabledException, UserNotFoundException, UserTotpSecretNotFoundException 
} from "@modules/exceptions"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    TotpSecretV2ResponseData 
} from "./totp-secret-v2.dto"
import {
    TotpService 
} from "@modules/totp"
import {
    DerivedAesKeyService 
} from "@modules/derived"
import {
    InjectPrivyClient 
} from "@modules/privy"
import {
    PrivyClient 
} from "@privy-io/node"

@Injectable()
export class TotpSecretV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly totpService: TotpService,
        private readonly derivedAesKeyService: DerivedAesKeyService,
        @InjectPrivyClient()
        private readonly privyClient: PrivyClient,
    ) {}

    async totpSecretV2(
        response: VerifyAccessTokenResponse
    ): Promise<TotpSecretV2ResponseData> {
        const user = await this.connection.model<UserSchema>(UserSchema.name).findOne({
            privyUserId: response.user_id 
        })
        if (!user) {
            throw new UserNotFoundException({
                privyUserId: response.user_id,
            })
        }
        if (user.mfaEnabled) {
            throw new UserMfaAlreadyEnabledException({
                id: user.id,
            })
        }
        const privyUser = await this.privyClient.users()._get(response.user_id)
        const email = privyUser.linked_accounts.find(account => account.type === "email")?.address
        if (!email) {
            throw new EmailNotFoundException({
                privyUserId: response.user_id,
            })
        }   
        // Decrypt the encrypted payload
        if (!user.encryptedTotpSecretPayload) {
            throw new UserTotpSecretNotFoundException({
                id: user.id,
            })
        }
        const decryptedTotpSecret = this.derivedAesKeyService.decrypt(user.encryptedTotpSecretPayload)
        return {
            totpSecret: decryptedTotpSecret,
            totpSecretUrl: this.totpService.generateTotpSecretUrl(decryptedTotpSecret,
                email),
        }
    }
}
