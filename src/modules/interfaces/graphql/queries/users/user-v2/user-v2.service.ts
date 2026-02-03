import {
    Injectable 
} from "@nestjs/common"
import {
    AppVersion, InjectPrimaryMongoose, UserSchema 
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    CodeGeneratorService 
} from "@modules/code"
import {
    DerivedAesKeyService 
} from "@modules/derived"
import {
    TotpService 
} from "@modules/totp"
import {
    PrivyClient 
} from "@privy-io/node"
import {
    EmailNotFoundException 
} from "@modules/exceptions"
import {
    InjectPrivyClient 
} from "@modules/privy"

@Injectable()
export class UserV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly codeGeneratorService: CodeGeneratorService,
        private readonly derivedAesKeyService: DerivedAesKeyService,
        private readonly totpService: TotpService,
        @InjectPrivyClient()
        private readonly privyClient: PrivyClient,
    ) {}

    async userV2(
        response: VerifyAccessTokenResponse
    ): Promise<UserSchema> {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({
                privyUserId: response.user_id 
            })
        if (!user) {
            const privyUser = await this.privyClient
                .users()
                ._get(response.user_id)
            // create the user
            const email = privyUser.linked_accounts.find(account => account.type === "email")?.address
            if (!email) {
                throw new EmailNotFoundException(
                    {
                        privyUserId: response.user_id,
                    }
                )
            }   
            const totpSecret = this.totpService.generateSecret(email)
            const [userRaw] = await this.connection
                .model<UserSchema>
                (UserSchema.name)
                .create(
                    [
                        {
                            privyUserId: response.user_id,
                            version: AppVersion.V2,
                            referralCode: this.codeGeneratorService.generateCode("KANI"),
                            mfaEnabled: false,
                            encryptedTotpSecretPayload: this.derivedAesKeyService.encrypt(totpSecret.base32),
                        }
                    ]
                )
            return userRaw.toJSON<UserSchema>()
        }
        return user.toJSON<UserSchema>()
    }
}

