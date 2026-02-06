import {
    Injectable 
} from "@nestjs/common"

import {
    InjectPrimaryMongoose, BotSchema, PositionSchema, 
    BotActivePositionSchema
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import { 
    BotRequest,
} from "./graphql-types"
import {
    BotNotFoundException 
} from "@modules/exceptions"
import {
    UserJwtLike 
} from "@modules/passport"

@Injectable()
export class BotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    async bot(
        { id }: BotRequest,
        userLike: UserJwtLike,
    ): Promise<BotSchema> {
        const bot = await this.connection
            .model<BotSchema>(
                BotSchema.name).findOne({
                user: userLike.id,
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

