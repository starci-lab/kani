import { Injectable } from "@nestjs/common"

import { InjectPrimaryMongoose, BotSchema, PositionSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { 
    BotRequest,
} from "./bot.dto"
import { BotNotFoundException } from "@exceptions"
import { UserJwtLike } from "@modules/passport"

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
            throw new BotNotFoundException()
        }
        const botJson = bot.toJSON<BotSchema>()
        const activePosition = await this.connection
            .model<PositionSchema>(PositionSchema.name).findOne({
                bot: bot.id,
                isActive: true,
            })
        if (activePosition) {
            botJson.activePosition = activePosition.toJSON<PositionSchema>()
        }
        return botJson
    }
}

