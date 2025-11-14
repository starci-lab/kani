import { Injectable } from "@nestjs/common"

import { InjectPrimaryMongoose, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { UserNotFoundException, UserTotpSecretNotFoundException } from "@exceptions"
import { EncryptionService } from "@modules/crypto"

@Injectable()
export class UsersService {
    constructor(
        @InjectPrimaryMongoose()
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