import { Injectable } from "@nestjs/common"
import { VerifyAuthTokenResponse } from "@privy-io/node"
import { VerifyPrivyAuthTokenResponseData } from "./auth-privy.dto"
import { InjectPrimaryMongoose, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"

@Injectable()
export class AuthPrivyService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    async verifyPrivyAuthToken(
        response: VerifyAuthTokenResponse
    ): Promise<VerifyPrivyAuthTokenResponseData> {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({
                privyUserId: response.user_id,
            })
        if (user) {
            return {
                userId: user.id,
            }
        }
        // create a new user
        const [userRaw] = await this.connection.model<UserSchema>(UserSchema.name).create([{
            privyUserId: response.user_id,
        }])
        const userJson = userRaw.toJSON()
        return {
            userId: userJson.id,
        }
    }
}   