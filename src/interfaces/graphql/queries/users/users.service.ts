import { Injectable } from "@nestjs/common"

import { InjectMongoose, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { UserNotFoundException, UserTotpSecretNotFoundException } from "@modules/errors/db/user"
import { EncryptionService } from "@modules/crypto"

@Injectable()
export class UsersService {
    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
        private readonly encryptionService: EncryptionService,
    ) {}

    async user(id: string): Promise<UserSchema> {
        const user = await this.connection.model<UserSchema>(UserSchema.name).findById(id)
        // set the temporary totp token if the user is not verified
        if (!user) {
            throw new UserNotFoundException()
        }
        if (!user.totpVerified) {
            if (!user?.encryptedTotpSecret) {
                throw new UserTotpSecretNotFoundException()
            }
            user.temporaryTotpToken = this.encryptionService.decrypt(
                user.encryptedTotpSecret
            )
        }
        return user
    }   
}