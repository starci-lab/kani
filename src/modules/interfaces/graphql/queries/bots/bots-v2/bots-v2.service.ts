import { Injectable } from "@nestjs/common"

import { InjectPrimaryMongoose, BotSchema, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { 
    BotsV2Cursor,
    BotsV2Request,
    BotsV2ResponseData,
} from "./bots-v2.dto"
import { NoMoreBotsFoundException, UserNotFoundException } from "@exceptions"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { DayjsService } from "@modules/mixin"

@Injectable()
export class BotsV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly dayjsService: DayjsService,
    ) {}

    async botsV2(
        {
            filters
        }: BotsV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<BotsV2ResponseData> {
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({ privyUserId: response.user_id })
        if (!user) {
            throw new UserNotFoundException("User not found with privy user id: " + response.user_id)
        }
        // retrieve the cursor from the filters
        const cursor = filters.cursor
        // create the query to get the bots
        const query = this.connection
            .model<BotSchema>(BotSchema.name)
            .find({ user: user.id })
        // get the sort order
        const sortOrder = filters.timestampAscending ? 1 : -1
        // sort the bots by createdAt
        query.sort({ createdAt: sortOrder })
        // If there is a cursor, get the previous/next cursor
        if (cursor) {
            // we use base64 to decode the cursor into a string
            const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8")
            // parse the cursor into a BotsV2Cursor object
            const { timestamp } = this.superJson.parse<BotsV2Cursor>(decodedCursor)
            // Assume the cursor is the timestamp of the last record
            const timestampDate = this.dayjsService.from(timestamp)
            // get the operator
            const operator = filters.timestampAscending ? "$gt" : "$lt"
            query.where(
                "createdAt",
                {
                    [operator]: timestampDate.toDate(),
                }
            )
        }
        // limit the number of bots to return
        query.limit(filters.limit ?? 10)
        // execute the query
        const bots = await query.exec()
        // return the bots
        // create the cursor for the next page
        // we have to take the last bot
        let cursorNext = ""
        if (bots.length === filters.limit) {
            const lastBot = bots.at(-1)
            if (!lastBot) {
                throw new NoMoreBotsFoundException("No more bots found")
            }
            const timestamp = this.dayjsService.from(lastBot.createdAt).toISOString()
            // create the cursor for the next page
            cursorNext = Buffer.from(
                this.superJson.stringify({ timestamp }))
                .toString("base64")
        }
        // return the bots
        return {
            cursor: cursorNext,
            data: bots,
        }
    }
}

export interface BotsV2Cursor {
    // the createdAt of the last record
    timestamp: string
}

