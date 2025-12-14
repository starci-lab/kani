import { Injectable } from "@nestjs/common"
import { InjectPrimaryMongoose, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { UserMfaAlreadyEnabledException, UserNotFoundException, UserTotpSecretNotFoundException } from "@exceptions"
import { UserJwtLike } from "@modules/passport"
import { TotpSecretResponseData } from "./users.dto"
import { TotpService } from "@modules/totp"
import { EncryptionService } from "@modules/crypto"

@Injectable()
export class UsersService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly encryptionService: EncryptionService,
        private readonly totpService: TotpService
    ) {}

    async user(
        { id }: UserJwtLike
    ): Promise<UserSchema> {
        const user = await this.connection.model<UserSchema>(UserSchema.name).findById(id)
        if (!user) {
            throw new UserNotFoundException("User not found")
        }
        return user.toJSON()
    }

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
        if (!user.encryptedTotpSecret) {
            throw new UserTotpSecretNotFoundException("User totp secret not found")
        }
        const decryptedTotpSecret = this.encryptionService.decrypt(user.encryptedTotpSecret)
        return {
            totpSecret: decryptedTotpSecret,
            totpSecretUrl: this.totpService.generateTotpSecretUrl(decryptedTotpSecret),
        }
    }
}