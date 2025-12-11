import { Injectable } from "@nestjs/common"

import { InjectPrimaryMongoose, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { UserNotFoundException } from "@exceptions"
import { VerifyAuthTokenResponse } from "@privy-io/node"

@Injectable()
export class UsersService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    async user(response: VerifyAuthTokenResponse): Promise<UserSchema> {
        const user = await this.connection.model<UserSchema>(UserSchema.name).findOne({
            privyUserId: response.user_id,
        })
        if (!user) {
            throw new UserNotFoundException()
        }
        return user
    }   
}