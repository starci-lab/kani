import { Injectable } from "@nestjs/common"
import { InjectPrimaryMongoose, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { UserNotFoundException } from "@exceptions"
import { UserJwtLike } from "@modules/passport"
import { InjectPrivyClient } from "@modules/privy"
import { PrivyClient } from "@privy-io/server-auth"

@Injectable()
export class User2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectPrivyClient()
        private readonly privyClient: PrivyClient,
    ) {}

    async user2(
        { id }: UserJwtLike
    ): Promise<UserSchema> {
        const user = await this.connection.model<UserSchema>(UserSchema.name).findById(id)
        if (!user) {
            throw new UserNotFoundException("User not found")
        }
        return user.toJSON()
    }
}

