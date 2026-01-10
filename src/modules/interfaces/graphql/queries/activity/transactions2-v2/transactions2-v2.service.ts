import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    TransactionSchema,
    BotSchema,
    UserSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    Transactions2V2Request,
    Transactions2V2ResponseData,
} from "./transactions2-v2.dto"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    UserNotFoundException,
} from "@exceptions"
import Decimal from "decimal.js"

@Injectable()
export class Transactions2V2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    async transactions2V2(
        {
            filters,
            botId
        }: Transactions2V2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<Transactions2V2ResponseData> {
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({ privyUserId: response.user_id })
        if (!user) {
            throw new UserNotFoundException("User not found with privy user id: " + response.user_id)
        }
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
        if (bot.user.toString() !== user.id) {
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
        query.limit(limit)
        // skip the number of items
        query.skip(new Decimal(pageNumber).sub(1).mul(limit).toNumber())
        // execute the query
        const transactions = await query.exec()
        // return the transactions
        return {
            count: transactions.length,
            data: transactions,
        }
    }
}

