import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema,
    UserSchema,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    PositionsV2Request,
    PositionsV2ResponseData,
} from "./positions-v2.dto"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    UserNotFoundException,
} from "@modules/exceptions"
import Decimal from "decimal.js"
import {
    envConfig 
} from "@modules/env"
import {
    ValidateService 
} from "../../../services"
import {
    PositionAssociateService 
} from "@modules/databases"

@Injectable()
export class PositionsV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly positionAssociateService: PositionAssociateService,
        private readonly validateService: ValidateService,
    ) { }

    async positionsV2(
        {
            filters: {
                limit = envConfig().pagination.positions.limit.default,
                pageNumber = envConfig().pagination.positions.pageNumber.default,
                asc,
            },
            botId,
            associate: {
                liquidityPool: liquidityPoolAssociate = true,
            } = {
            },
        }: PositionsV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<PositionsV2ResponseData> {
        // validate the limit
        this.validateService.validateLimit({
            limit, min: envConfig().pagination.positions.limit.min, max: envConfig().pagination.positions.limit.max 
        })
        // validate the page number
        this.validateService.validatePageNumber({
            pageNumber, max: envConfig().pagination.positions.pageNumber.max 
        })
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({
                privyUserId: response.user_id 
            })
        if (!user) {
            throw new UserNotFoundException({
                privyUserId: response.user_id,
            })
        }
        // retrieve the cursor from the filters
        // check if the bot exists
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)
        if (!bot) {
            throw new BotNotFoundException({
                id: botId,
            })
        }
        // check if the bot is owned by the user
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException({
                id: botId,
                userId: user.id,
            })
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
        query.sort({
            "closeSnapshot.snapshotAt": sortOrder 
        })
        // limit the number of positions to return
        query.limit(limit)
        // limit the number of positions to return
        query.skip(new Decimal(pageNumber).sub(1).mul(limit).toNumber())
        // execute the query
        const positions = await query.exec()
        // attach the associated liquidity pool to the positions
        if (liquidityPoolAssociate) {
            for (const position of positions) {
                this.positionAssociateService.associateLiquidityPool(position)
            }
        }
        // return the positions
        return {
            count: positions.length,
            data: positions,
        }
    }
}

