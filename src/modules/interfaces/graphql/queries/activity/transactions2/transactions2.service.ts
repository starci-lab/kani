import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    TransactionSchema,
    BotSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    Transactions2Request,
    Transactions2ResponseData,
} from "./transactions2.dto"
import { UserJwtLike } from "@modules/passport"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
} from "@exceptions"
import Decimal from "decimal.js"
import { envConfig } from "@modules/env"

@Injectable()
export class Transactions2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    async transactions2(
        {
            filters,
            botId
        }: Transactions2Request,
        userLike: UserJwtLike,
    ): Promise<Transactions2ResponseData> {
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
        // create the query to get the transactions
        const query = this.connection
            .model<TransactionSchema>(TransactionSchema.name)
            .find({ bot: botId })
        // get the sort order
        const sortOrder = filters.timestampAscending ? 1 : -1
        // sort the transactions by createdAt
        query.sort({ timestamp: sortOrder })
        // limit the number of transactions to return
        const _limit = limit ?? envConfig().pagination.transactions2.limit.default
        const _pageNumber = pageNumber ?? 1
        query.limit(_limit)
        // skip the number of items
        query.skip(new Decimal(_pageNumber).sub(1).mul(_limit).toNumber())
        // execute the query
        const transactions = await query.exec()
        // return the transactions
        // create the cursor for the next page
        // we have to take the last transaction
        // return the transactions
        return {
            count: transactions.length,
            data: transactions,
        }
    }
}

