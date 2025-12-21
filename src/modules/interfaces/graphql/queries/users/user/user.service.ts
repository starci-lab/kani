import { Injectable } from "@nestjs/common"
import { InjectPrimaryMongoose, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { UserNotFoundException } from "@exceptions"
import { UserJwtLike } from "@modules/passport"

@Injectable()
export class UserService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
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
}

