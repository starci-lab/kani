import { Injectable } from "@nestjs/common"
import { 
    AppVersion, 
    BotSchema, 
    InjectPrimaryMongoose, 
    UserSchema 
} from "@modules/databases"
import { Connection } from "mongoose"
import { 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    BotNotV2Exception, 
    UserNotFoundException 
} from "@exceptions"
import { UpdateBotSettingsV2Request } from "./update-bot-settings-v2.dto"
import { VerifyAccessTokenResponse } from "@privy-io/node"

@Injectable()
export class UpdateBotSettingsV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    async updateBotSettingsV2(
        {
            id,
            name,
            isExitToUsdc,
        }: UpdateBotSettingsV2Request,
        response: VerifyAccessTokenResponse,
    ) {
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({ privyUserId: response.user_id })
        if (!user) {
            throw new UserNotFoundException("User not found with privy user id: " + response.user_id)
        }
        // we try to find the bot in the database
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(id)
        if (!bot) {
            throw new BotNotFoundException("Bot not found with id: " + id)
        }
        // check whether the user is the owner of the bot
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException("User is not the owner of the bot")
        }
        // check if bot is v2
        if (bot.version !== AppVersion.V2) {
            throw new BotNotV2Exception("Bot is not v2. Please use updateBotLiquidityPoolsV2 mutation for v2 bots.")
        }
        // we update the bot settings
        const update = {
            name,
            isExitToUsdc,
        }
        // delete undefined fields
        Object.keys(update).forEach(
            (key) => update[key] === undefined || update[key] === null && delete update[key]
        )
        // update the bot settings
        await this.connection.model<BotSchema>(BotSchema.name).updateOne(
            { _id: id },
            { $set: update }
        )
    }
}


