import {
    Injectable 
} from "@nestjs/common"
import { 
    InjectPrimaryMongoose, 
    BotSchema,
    UserSchema,
    AppVersion,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import { 
    ToggleBotV2Request, 
} from "./graphql-types"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    BotNotV2Exception,
    UserNotFoundException,
} from "@modules/exceptions"

@Injectable()
export class ToggleBotV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    async toggleBotV2(
        response: VerifyAccessTokenResponse,
        {
            id,
            running,
        }: ToggleBotV2Request,
    ) {
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({
                privyUserId: response.user_id 
            })
        if (!user) {
            throw new UserNotFoundException({
                privyUserId: response.user_id,
            })
        }
        // we try to find the bot in the database
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(id)
        if (!bot) {
            throw new BotNotFoundException({
                id,
            })
        }
        // check whether the user is the owner of the bot
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException({
                id,
                userId: user.id,
            })
        }
        // check if bot is v2
        if (bot.version !== AppVersion.V2) {
            throw new BotNotV2Exception({
                id,
            })
        }
        // we toggle the bot running state
        await this.connection.model<BotSchema>(BotSchema.name).updateOne(
            {
                _id: id 
            },
            {
                $set: {
                    running 
                } 
            }
        )
    }
}

