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
    VerifyMultiStepsRequest,
    VerifyMultiStepsResponseData 
} from "./verify-multi-step.dto"
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
export class VerifyMultiStepsService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly totpService: TotpService,
        private readonly derivedAesKeyService: DerivedAesKeyService,
    ) {}

    async verifyMultiSteps(
        response: VerifyAccessTokenResponse,
        { totpCode }: VerifyMultiStepsRequest
    ): Promise<VerifyMultiStepsResponseData> {
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
        
        return {
            verified: true,
        }
    }
}
