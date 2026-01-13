import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    BotsRequest,
    BotsResponseData,
} from "./bots.dto"
import { UserJwtLike } from "@modules/passport"
import Decimal from "decimal.js"
import { ProfitService } from "../../../services"
import { envConfig } from "@modules/env"
import { ValidateService } from "../../../services"

@Injectable()
export class BotsService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly profitService: ProfitService,
        private readonly validateService: ValidateService,
    ) { }

    async bots(
        {
            filters: {
                pageNumber = envConfig().pagination.bots.pageNumber.default,
                limit = envConfig().pagination.bots.limit.default,
                asc = false,
            },
        }: BotsRequest,
        userLike: UserJwtLike,
    ): Promise<BotsResponseData> {
        // validate the limit
        this.validateService.validateLimit({ limit, min: envConfig().pagination.bots.limit.min, max: envConfig().pagination.bots.limit.max })
        // validate the page number
        this.validateService.validatePageNumber({ pageNumber, max: envConfig().pagination.bots.pageNumber.max })
        // create the query to get the bots
        const query = this.connection
            .model<BotSchema>(BotSchema.name)
            .find({ 
                user: userLike.id
            }
            )
            // get the sort order
        const sortOrder = asc ? 1 : -1
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

