import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    TransactionSchema,
    BotSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    TransactionsRequest,
    TransactionsResponseData,
} from "./transactions.dto"
import { UserJwtLike } from "@modules/passport"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
} from "@modules/exceptions"
import Decimal from "decimal.js"
import { envConfig } from "@modules/env"

@Injectable()
export class TransactionsService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    async transactions(
        {
            filters: {
                pageNumber = envConfig().pagination.transactions.pageNumber.default,
                limit = envConfig().pagination.transactions.limit.default,
                asc = false,
            },
            botId
        }: TransactionsRequest,
        userLike: UserJwtLike,
    ): Promise<TransactionsResponseData> {
        // retrieve the cursor from the filters
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
        const sortOrder = asc ? 1 : -1
        // sort the transactions by createdAt
        query.sort({ createdAt: sortOrder })
        // limit the number of transactions to return
        query.limit(limit)
        // skip the number of items
        query.skip(new Decimal(pageNumber).sub(1).mul(limit).toNumber())
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

