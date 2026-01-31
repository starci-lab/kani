import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    UserSchema,
    BotStatus,
    LiquidityPoolType
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
import {
    ActivePositionAssociateService 
} from "@modules/databases"
import {
    AsyncService 
} from "@modules/mixin"
import {
    CacheKey,
    CacheService 
} from "@modules/cache"
import BN from "bn.js"

@Injectable()
export class BotsV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly performanceService: PerformanceService,
        private readonly validateService: ValidateService,
        private readonly activePositionAssociateService: ActivePositionAssociateService,
        private readonly asyncService: AsyncService,
        private readonly cacheService: CacheService,
    ) { }

    async botsV2(
        {
            filters: {
                pageNumber = envConfig().pagination.bots.pageNumber.default,
                limit = envConfig().pagination.bots.limit.default,
                asc = false,
                searchString,
            } = {
            },
            associate: {
                activePosition: {
                    liquidityPool: activePositionLiquidityPoolAssociate = false,
                    position: activePositionPositionAssociate = false,
                } = {
                },
                status: statusAssociate = false,
            } = {
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
        if (activePositionPositionAssociate) {
            await this.activePositionAssociateService.attachAssociatedPositionsToBotActivePositions(bots)
        }
        if (activePositionLiquidityPoolAssociate) {
            await this.activePositionAssociateService.attachAssociatedLiquidityPoolToBotActivePositions(bots)
        }
        if (statusAssociate) {
            // if the bot do not have an active position, set the status to idle
            await this.asyncService.allIgnoreError(
                bots.map(
                    async (bot) => {
                        if (!bot.activePosition) {
                            bot.status = BotStatus.Idle
                        }
                        const type = bot.activePosition?.associatedLiquidityPool?.type
                        switch (type) {
                        case LiquidityPoolType.Clmm: {
                            const cache = await this.cacheService.get(
                                {
                                    key: CacheKey.DynamicClmmLiquidityPoolInfo,
                                    args: [bot.activePosition?.liquidityPool.toString()],
                                }
                            )
                            if (cache) {
                                const { tickCurrent } = cache
                                if (
                                    tickCurrent.lt(new BN(bot.activePosition?.associatedPosition?.clmmState?.tickLower ?? 0)) 
                                    || tickCurrent.gt(new BN(bot.activePosition?.associatedPosition?.clmmState?.tickUpper ?? 0))) {
                                    bot.status = BotStatus.OutOfRange
                                } else {
                                    bot.status = BotStatus.InRange
                                }
                            }
                            break
                        }
                        case LiquidityPoolType.Dlmm: {
                            const cache = await this.cacheService.get(
                                {
                                    key: CacheKey.DynamicDlmmLiquidityPoolInfo,
                                    args: [bot.activePosition?.liquidityPool.toString()],
                                }
                            )
                            if (cache) {
                                const { activeId } = cache
                                if (
                                    activeId.lt(new BN(bot.activePosition?.associatedPosition?.dlmmState?.minBinId ?? 0)) 
                                    || activeId.gt(new BN(bot.activePosition?.associatedPosition?.dlmmState?.maxBinId ?? 0))) {
                                    bot.status = BotStatus.OutOfRange
                                } else {
                                    bot.status = BotStatus.InRange
                                }
                            }
                            break
                        }
                        }
                    }
                )
            )
        }
        // return the bots
        return {
            count: bots.length,
            data: bots,
        }
    }
}

