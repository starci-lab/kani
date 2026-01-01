import { Injectable } from "@nestjs/common"
import { InjectPrimaryMongoose, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { UserMfaAlreadyEnabledException, UserNotFoundException, UserTotpSecretNotFoundException } from "@exceptions"
import { UserJwtLike } from "@modules/passport"
import { TotpSecretResponseData } from "./totp-secret.dto"
import { TotpService } from "@modules/totp"
import { SealedAesService } from "@modules/sealed"

@Injectable()
export class TotpSecretService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly totpService: TotpService,
        private readonly sealedAesService: SealedAesService,
    ) {}

    async totpSecret(
        { id }: UserJwtLike
    ): Promise<TotpSecretResponseData> {
        const user = await this.connection.model<UserSchema>(UserSchema.name).findById(id)
        if (!user) {
            throw new UserNotFoundException("User not found")
        }
        if (user.mfaEnabled) {
            throw new UserMfaAlreadyEnabledException("User MFA already enabled")
        }
        if (!user.encryptedTotpSecretPayload) {
            throw new UserTotpSecretNotFoundException("User totp secret not found")
        }
        const decryptedTotpSecret = await this.sealedAesService.decrypt(user.encryptedTotpSecretPayload)
        return {
            totpSecret: decryptedTotpSecret,
            totpSecretUrl: this.totpService.generateTotpSecretUrl(decryptedTotpSecret),
        }
    }
}

