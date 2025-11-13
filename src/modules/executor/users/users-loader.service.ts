import { InjectPrimaryMongoose, UserSchema } from "@modules/databases"
import { envConfig } from "@modules/env"
import { Injectable } from "@nestjs/common"
import { Connection } from "mongoose"
import { USERS_PER_BATCH } from "./constants"
    
@Injectable()
export class UsersLoaderService {
    private users: Array<UserSchema> = []
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { 
    }

    // load users from database
    async load(): Promise<void> {
        const batchId = envConfig().botExecutor.batchId
        const users = await this.connection
            .model<UserSchema>(UserSchema.name)
            .find()
            .skip(batchId * USERS_PER_BATCH)
            .limit(USERS_PER_BATCH)
            .lean<Array<UserSchema>>()
            .exec()
        this.users = users
    }
}   
