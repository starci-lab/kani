import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    TransactionSchema,
    BotSchema,
    PositionSchema
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    PositionsCursor,
    PositionsRequest,
    PositionsResponseData,
    TransactionsCursor,
    TransactionsRequest,
    TransactionsResponseData,
} from "./activity.dto"
import { UserJwtLike } from "@modules/passport"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { DayjsService } from "@modules/mixin"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    NoMoreTransactionsFoundException,
    NoMorePositionsFoundException
} from "@exceptions"

@Injectable()
export class ActivityService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly dayjsService: DayjsService,
    ) { }

    async transactions(
        {
            filters,
            botId
        }: TransactionsRequest,
        userLike: UserJwtLike,
    ): Promise<TransactionsResponseData> {
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
        if (bot.user.toString() !== userLike.id) {
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
            // parse the cursor into a TransactionsCursor object
            const { timestamp } = this.superJson.parse<TransactionsCursor>(decodedCursor)
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

    async positions(
        {
            filters,
            botId
        }: PositionsRequest,
        userLike: UserJwtLike,
    ): Promise<PositionsResponseData> {
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
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException("Bot not owned by user")
        }
        // create the query to get the positions
        const query = this.connection
            .model<PositionSchema>(PositionSchema.name)
            .find({ bot: botId })
        // get the sort order
        const sortOrder = filters.timestampAscending ? 1 : -1
        // sort the positions by positionOpenedAt
        query.sort({ timestamp: sortOrder })
        // If there is a cursor, get the previous/next cursor
        if (cursor) {
            // we use base64 to decode the cursor into a string
            const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8")
            // parse the cursor into a PositionsCursor object
            const { timestamp } = this.superJson.parse<PositionsCursor>(decodedCursor)
            // Assume the cursor is the timestamp of the last record
            const timestampDate = this.dayjsService.from(timestamp)
            // get the operator
            const operator = filters.timestampAscending ? "$gt" : "$lt"
            query.where(
                "positionOpenedAt",
                {
                    [operator]: timestampDate.toDate(),
                }
            )
        }
        // limit the number of positions to return
        query.limit(filters.limit ?? 10)
        // execute the query
        const positions = await query.exec()
        // return the positions
        // create the cursor for the next page
        // we have to take the last position
        let cursorNext = ""
        if (positions.length === filters.limit) {
            const lastPosition = positions.at(-1)
            if (!lastPosition) {
                throw new NoMorePositionsFoundException("No more positions found")
            }
            const timestamp = this.dayjsService.from(lastPosition.positionOpenedAt).toISOString()
            // create the cursor for the next page
            cursorNext = Buffer.from(
                this.superJson.stringify({ timestamp }))
                .toString("base64")
        }
        // return the positions
        return {
            cursor: cursorNext,
            data: positions,
        }
    }
}