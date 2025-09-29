import { Injectable } from "@nestjs/common"

import { InjectMongoose, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { UserNotFoundException } from "@modules/errors/db/user"

@Injectable()
export class UsersService {
    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
    ) {}

    async queryUser(id: string): Promise<UserSchema> {
        const user = await this.connection.model<UserSchema>(UserSchema.name).findById(id)
        if (!user) {
            throw new UserNotFoundException()
        }
        return user
    }   
}