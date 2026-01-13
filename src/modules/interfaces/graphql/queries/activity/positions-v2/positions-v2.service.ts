import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema,
    UserSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    PositionsV2Request,
    PositionsV2ResponseData,
} from "./positions-v2.dto"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    UserNotFoundException,
} from "@exceptions"
import Decimal from "decimal.js"
import { envConfig } from "@modules/env"
import { AttachLiquidityPoolService } from "../../../services"
import { ValidateService } from "../../../services"

@Injectable()
export class PositionsV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly attachLiquidityPoolService: AttachLiquidityPoolService,
        private readonly validateService: ValidateService,
    ) { }

    async positionsV2(
        {
            filters: {
                limit = envConfig().pagination.positions.limit.default,
                pageNumber = envConfig().pagination.positions.pageNumber.default,
                asc,
            },
            botId
        }: PositionsV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<PositionsV2ResponseData> {
        // validate the limit
        this.validateService.validateLimit({ limit, min: envConfig().pagination.positions.limit.min, max: envConfig().pagination.positions.limit.max })
        // validate the page number
        this.validateService.validatePageNumber({ pageNumber, max: envConfig().pagination.positions.pageNumber.max })
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({ privyUserId: response.user_id })
        if (!user) {
            throw new UserNotFoundException("User not found with privy user id: " + response.user_id)
        }
        // retrieve the cursor from the filters
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
            .find({ 
                bot: botId, 
                isActive: false 
            }
            )
        // get the sort order
        const sortOrder = asc ? 1 : -1
        // sort the positions by createdAt
        query.sort({ createdAt: sortOrder })
        // limit the number of positions to return
        query.limit(limit)
        // limit the number of positions to return
        query.skip(new Decimal(pageNumber).sub(1).mul(limit).toNumber())
        // execute the query
        const positions = await query.exec()
        // attach the associated liquidity pool to the positions
        for (const position of positions) {
            this.attachLiquidityPoolService.attachLiquidityPoolToPosition(position)
        }
        // return the positions
        return {
            count: positions.length,
            data: positions,
        }
    }
}

