import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema,
    UserSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    PositionsV2Cursor,
    PositionsV2Request,
    PositionsV2ResponseData,
} from "./positions-v2.dto"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { DayjsService } from "@modules/mixin"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    NoMorePositionsFoundException,
    UserNotFoundException,
} from "@exceptions"

@Injectable()
export class PositionsV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly dayjsService: DayjsService,
    ) { }

    async positionsV2(
        {
            filters,
            botId
        }: PositionsV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<PositionsV2ResponseData> {
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
        // create the query to get the positions
        const query = this.connection
            .model<PositionSchema>(PositionSchema.name)
            .find({ bot: botId })
        // get the sort order
        const sortOrder = filters.asc ? 1 : -1
        // sort the positions by createdAt
        query.sort({ createdAt: sortOrder })
        // If there is a cursor, get the previous/next cursor
        if (cursor) {
            // we use base64 to decode the cursor into a string
            const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8")
            // parse the cursor into a PositionsV2Cursor object
            const { timestamp } = this.superJson.parse<PositionsV2Cursor>(decodedCursor)
            // Assume the cursor is the timestamp of the last record
            const timestampDate = this.dayjsService.from(timestamp)
            // get the operator
            const operator = filters.asc ? "$gt" : "$lt"
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
        // attach the associated liquidity pool to the positions
        return {
            cursor: cursorNext,
            data: positions,
        }
    }
}

