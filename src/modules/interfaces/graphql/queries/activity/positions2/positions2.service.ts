import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    Positions2Request,
    Positions2ResponseData,
} from "./positions2.dto"
import { UserJwtLike } from "@modules/passport"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
} from "@exceptions"
import Decimal from "decimal.js"

@Injectable()
export class Positions2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    async positions2(
        {
            filters,
            botId
        }: Positions2Request,
        userLike: UserJwtLike,
    ): Promise<Positions2ResponseData> {
        // retrieve the cursor from the filters
        const { pageNumber, limit } = filters
        // check if the bot exists
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)
        if (!bot) {
            throw new BotNotFoundException("Bot not found")
        }
        // check if the bot is owned by the user
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException("Bot not owned by user")
        }
        // create the query to get the positions
        const query = this.connection
            .model<PositionSchema>(PositionSchema.name)
            .find({ 
                bot: botId, 
                isActive: false 
            }
            )
        // get the sort order
        const sortOrder = filters.timestampAscending ? 1 : -1
        // sort the positions by positionOpenedAt
        query.sort({ timestamp: sortOrder })
        // If there is a cursor, get the previous/next cursor
        query.limit(limit)
        // limit the number of positions to return
        query.skip(new Decimal(pageNumber).sub(1).mul(limit).toNumber())
        // execute the query
        const positions = await query.exec()
        // return the positions
        // create the cursor for the next page
        // we have to take the last position
        // return the positions
        return {
            count: positions.length,
            data: positions,
        }
    }
}

