import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    UserSchema
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    BotsV2Request,
    BotsV2ResponseData,
} from "./bots-v2.dto"
import Decimal from "decimal.js"
import {
    PerformanceService 
} from "../../../services"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    UserNotFoundException 
} from "@modules/exceptions"
import {
    envConfig 
} from "@modules/env"
import {
    ValidateService 
} from "../../../services"

@Injectable()
export class BotsV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly performanceService: PerformanceService,
        private readonly validateService: ValidateService,
    ) { }

    async botsV2(
        {
            filters: {
                pageNumber = envConfig().pagination.bots.pageNumber.default,
                limit = envConfig().pagination.bots.limit.default,
                asc = false,
                searchString,
            },
        }: BotsV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<BotsV2ResponseData> {
        // validate the limit
        this.validateService.validateLimit(
            {
                limit, 
                min: envConfig().pagination.bots.limit.min, 
                max: envConfig().pagination.bots.limit.max 
            }
        )
        // validate the page number
        this.validateService.validatePageNumber({
            pageNumber, 
            max: envConfig().pagination.bots.pageNumber.max 
        })
        // create the query to get the bots
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
        const query = this.connection
            .model<BotSchema>(BotSchema.name)
            .find(
                { 
                    user: user.id,
                    ...(
                        searchString ? {
                            name: {
                                $regex: searchString,
                                $options: "i",
                            }
                        } : {        
                        }
                    ),
                }
            )
        // get the sort order
        const sortOrder = asc ? 1 : -1
        // sort the bots by createdAt
        query.sort(
            {
                createdAt: sortOrder 
            }
        )    
        // limit the number of bots to return
        query.limit(limit)
        // skip the number of bots based on page number
        query.skip(new Decimal(pageNumber).sub(1).mul(limit).toNumber())
        // execute the query
        const bots = await query.exec()
        // get the roi for the bots
        const performances24h = await this.performanceService.performance24h(
            {
                botIds: bots.map(bot => bot.id),
            }
        )
        // add the profits to the bots
        bots.forEach(bot => {
            const performance24h = performances24h.find(performance => performance.id === bot.id)
            if (performance24h) {
                bot.performance24h = {
                    roi: performance24h.roi.toNumber(),
                    pnl: performance24h.pnl.toNumber(),
                    roiInUsd: performance24h.roiInUsd.toNumber(),
                    pnlInUsd: performance24h.pnlInUsd.toNumber(),
                }
            } else {
                bot.performance24h = {
                    roi: 0,
                    pnl: 0,
                    roiInUsd: 0,
                    pnlInUsd: 0,
                }
            }
        })
        // return the bots
        return {
            count: bots.length,
            data: bots,
        }
    }
}

