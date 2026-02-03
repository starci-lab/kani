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
    UserMfaAlreadyEnabledException, UserNotFoundException, UserTotpSecretNotFoundException 
} from "@modules/exceptions"
import {
    UserJwtLike 
} from "@modules/passport"
import {
    TotpSecretResponseData 
} from "./totp-secret.dto"
import {
    TotpService 
} from "@modules/totp"
import {
    DerivedAesKeyService 
} from "@modules/derived"

@Injectable()
export class TotpSecretService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly totpService: TotpService,
        private readonly derivedAesKeyService: DerivedAesKeyService
    ) {}

    async totpSecret(
        { id }: UserJwtLike
    ): Promise<TotpSecretResponseData> {
        const user = await this.connection.model<UserSchema>(UserSchema.name).findById(id)
        if (!user) {
            throw new UserNotFoundException({
                id,
            })
        }
        if (user.mfaEnabled) {
            throw new UserMfaAlreadyEnabledException({
                id,
            })
        }
        if (!user.encryptedTotpSecretPayload) {
            throw new UserTotpSecretNotFoundException({
                id,
            })
        }
        const decryptedTotpSecret = this.derivedAesKeyService.decrypt(user.encryptedTotpSecretPayload)
        return {
            totpSecret: decryptedTotpSecret,
            totpSecretUrl: this.totpService.generateTotpSecretUrl(decryptedTotpSecret,
                user.email),
        }
    }
}

