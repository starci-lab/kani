import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    TransactionSchema,
    BotSchema,
    UserSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    TransactionsV2Cursor,
    TransactionsV2Request,
    TransactionsV2ResponseData,
} from "./transactions-v2.dto"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { DayjsService } from "@modules/mixin"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    NoMoreTransactionsFoundException,
    UserNotFoundException,
} from "@exceptions"

@Injectable()
export class TransactionsV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly dayjsService: DayjsService,
    ) { }

    async transactionsV2(
        {
            filters,
            botId
        }: TransactionsV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<TransactionsV2ResponseData> {
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({ privyUserId: response.user_id })
        if (!user) {
            throw new UserNotFoundException("User not found with privy user id: " + response.user_id)
        }
        // retrieve the cursor from the filters
        const cursor = filters.cursor
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
            .find({ 
                bot: botId, 
                isActive: false 
            })
        // get the sort order
        const sortOrder = filters.timestampAscending ? 1 : -1
        // sort the transactions by createdAt
        query.sort({ timestamp: sortOrder })
        // If there is a cursor, get the previous/next cursor
        if (cursor) {
            // we use base64 to decode the cursor into a string
            const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8")
            // parse the cursor into a TransactionsV2Cursor object
            const { timestamp } = this.superJson.parse<TransactionsV2Cursor>(decodedCursor)
            // Assume the cursor is the timestamp of the last record
            const timestampDate = this.dayjsService.from(timestamp)
            // get the operator
            const operator = filters.timestampAscending ? "$gt" : "$lt"
            query.where(
                "timestamp",
                {
                    [operator]: timestampDate.toDate(),
                }
            )
        }
        // limit the number of transactions to return
        query.limit(filters.limit ?? 10)
        // execute the query
        const transactions = await query.exec()
        // return the transactions
        // create the cursor for the next page
        // we have to take the last transaction
        let cursorNext = ""
        if (transactions.length === filters.limit) {
            const lastTransaction = transactions.at(-1)
            if (!lastTransaction) {
                throw new NoMoreTransactionsFoundException("No more transactions found")
            }
            const timestamp = this.dayjsService.from(lastTransaction.timestamp).toISOString()
            // create the cursor for the next page
            cursorNext = Buffer.from(
                this.superJson.stringify({ timestamp }))
                .toString("base64")
        }
        // return the transactions
        return {
            cursor: cursorNext,
            data: transactions,
        }
    }
}

