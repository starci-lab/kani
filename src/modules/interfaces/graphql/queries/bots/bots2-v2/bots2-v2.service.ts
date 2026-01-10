import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    UserSchema
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    Bots2V2Request,
    Bots2V2ResponseData,
} from "./bots2-v2.dto"
import Decimal from "decimal.js"
import { ProfitService } from "../services"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import { UserNotFoundException } from "@exceptions"

@Injectable()
export class Bots2V2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly profitService: ProfitService,
    ) { }

    async bots2V2(
        {
            filters
        }: Bots2V2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<Bots2V2ResponseData> {
        // retrieve the cursor from the filters
        const { pageNumber, limit } = filters
        // create the query to get the bots
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({ privyUserId: response.user_id })
        if (!user) {
            throw new UserNotFoundException("User not found")
        }
        const query = this.connection
            .model<BotSchema>(BotSchema.name)
            .find({ 
                user: user.id,
            }
            )
        // get the sort order
        const sortOrder = filters.timestampAscending ? 1 : -1
        // sort the bots by createdAt
        query.sort({ createdAt: sortOrder })
        // limit the number of bots to return
        query.limit(limit)
        // skip the number of bots based on page number
        query.skip(new Decimal(pageNumber).sub(1).mul(limit).toNumber())
        // execute the query
        const bots = await query.exec()
        // get the roi for the bots
        const profits24h = await this.profitService.profit24h({
            botIds: bots.map(bot => bot.id),
        })
        // add the profits to the bots
        bots.forEach(bot => {
            const profit24h = profits24h.find(profit => profit.id === bot.id)
            if (profit24h) {
                bot.roi24h = profit24h.roi24h
                bot.pnl24h = profit24h.pnl24h
            }
        })
        // return the bots
        return {
            count: bots.length,
            data: bots,
        }
    }
}

