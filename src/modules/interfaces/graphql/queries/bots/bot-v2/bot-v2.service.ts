import {
    Injectable 
} from "@nestjs/common"

import {
    InjectPrimaryMongoose, 
    BotSchema,
    PositionSchema, 
    UserSchema, 
    BotActivePositionSchema
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import { 
    BotV2Request,
} from "./bot-v2.dto"
import {
    BotNotFoundException 
} from "@modules/exceptions"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    UserNotFoundException 
} from "@modules/exceptions"

@Injectable()
export class BotV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    async botV2(
        { id }: BotV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<BotSchema> {
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
        const bot = await this.connection
            .model<BotSchema>(
                BotSchema.name).findOne({
                user: user.id,
                _id: id,
            })
        if (!bot) {
            throw new BotNotFoundException({
                id,
            })
        }
        const botJson = bot.toJSON<BotSchema>()
        const activePosition = await this.connection
            .model<PositionSchema>(PositionSchema.name).findOne({
                bot: bot.id,
                isActive: true,
            })
        if (activePosition) {
            botJson.activePosition = activePosition.toJSON<BotActivePositionSchema>()
        }
        return botJson
    }
}

