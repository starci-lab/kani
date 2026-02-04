import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    PositionsRequest,
    PositionsResponseData,
} from "./positions.dto"
import {
    UserJwtLike 
} from "@modules/passport"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
} from "@modules/exceptions"
import Decimal from "decimal.js"
import {
    envConfig 
} from "@modules/env"

@Injectable()
export class PositionsService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    async positions(
        {
            filters: {
                limit,
                pageNumber,
                asc,
            },
            botId
        }: PositionsRequest,
        userLike: UserJwtLike,
    ): Promise<PositionsResponseData> {
        // retrieve the cursor from the filters
        // check if the bot exists
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)
        if (!bot) {
            throw new BotNotFoundException({
                id: botId,
            })
        }
        // check if the bot is owned by the user
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException({
                id: botId,
                userId: userLike.id,
            })
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
        const sortOrder = asc ? 1 : -1
        // sort the positions by positionOpenedAt
        query.sort({
            "closeSnapshot.snapshotAt": sortOrder 
        })
        // If there is a cursor, get the previous/next cursor
        const _limit = limit ?? envConfig().pagination.positions.limit.default
        const _pageNumber = pageNumber ?? 1
        query.limit(_limit)
        // skip the number of items
        query.skip(new Decimal(_pageNumber).sub(1).mul(_limit).toNumber())
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

