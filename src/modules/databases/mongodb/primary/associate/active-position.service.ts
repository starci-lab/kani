import {
    Injectable
} from "@nestjs/common"
import {
    InjectPrimaryMongoose
} from "../mongodb.decorators"
import {
    Connection, Types
} from "mongoose"
import {
    BotSchema, LiquidityPoolSchema, PositionSchema
} from "../schemas"
import {
    AssociatedPositionNotFoundException, LiquidityPoolNotFoundException
} from "@exceptions"
import {
    PrimaryMemoryStorageService
} from "../memory"
import {
    CacheKey,
    CacheService 
} from "@modules/cache"
import {
    AsyncService 
} from "@modules/mixin"

export interface AttachAssociatedLiquidityPoolToBotActivePositionsOptions {
    withAnalytics: boolean
}

@Injectable()
export class ActivePositionAssociateService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly cacheService: CacheService,
        private readonly asyncService: AsyncService,
    ) { }

    /**
   * Attach associated Position data into each bot.activePosition.
   */
    async attachAssociatedPositionsToBotActivePositions(
        bots: Array<BotSchema>
    ): Promise<void> {
        const botsWithActivePosition = bots.filter(
            (
                bot,
            ): bot is BotSchema & {
                activePosition: NonNullable<BotSchema["activePosition"]>
            } => Boolean(bot.activePosition),
        )

        if (botsWithActivePosition.length === 0) {
            return
        }

        const positionIds: Array<Types.ObjectId> = botsWithActivePosition.map(
            bot => new Types.ObjectId(bot.activePosition.position.toString()),
        )

        const positions = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .find({
                _id: {
                    $in: positionIds
                },
            })
            .exec()
        const positionMap = new Map<string, PositionSchema>(
            positions.map(position => [position.id,
                position]),
        )

        for (const bot of botsWithActivePosition) {
            const positionId = bot.activePosition.position.toString()
            const position = positionMap.get(positionId)

            if (!position) {
                throw new AssociatedPositionNotFoundException({
                    botId: bot.id,
                })
            }
            bot.activePosition.associatedPosition =
                position.toJSON<PositionSchema>()
        }
    }

    /**
   * Attach associated LiquidityPool data into each bot.activePosition.
   */
    async attachAssociatedLiquidityPoolToBotActivePositions(
        bots: Array<BotSchema>
    ): Promise<void> {
        const botsWithActivePosition = bots.filter(
            (
                bot,
            ): bot is BotSchema & {
                activePosition: NonNullable<BotSchema["activePosition"]>
            } => Boolean(bot.activePosition),
        )

        if (botsWithActivePosition.length === 0) {
            return
        }

        const liquidityPoolIds: Array<string> =
            botsWithActivePosition.map(
                bot => bot.activePosition.liquidityPool.toString(),
            )
        const liquidityPools: Array<LiquidityPoolSchema> =
            this.primaryMemoryStorageService.liquidityPoolCollection.chain().find(
                {
                    id: {
                        $in: liquidityPoolIds
                    },
                },
            ).data({
                removeMeta: true,
            }
            )
        const liquidityPoolMap =
            new Map<string, LiquidityPoolSchema>(
                liquidityPools.map(liquidityPool => [
                    liquidityPool.id,
                    liquidityPool,
                ]),
            )
        
        const promises: Array<Promise<void>> = []
        for (const bot of botsWithActivePosition) {
            promises.push(
                (async () => {
                    const liquidityPoolId =
                bot.activePosition.liquidityPool.toString()
                    const liquidityPool =
                liquidityPoolMap.get(liquidityPoolId)

                    if (!liquidityPool) {
                        throw new LiquidityPoolNotFoundException({
                            id: liquidityPoolId,
                        })
                    }
                    const analytics = await this.cacheService.get(
                        {
                            key: CacheKey.PoolAnalytics,
                            args: [liquidityPoolId],
                        }
                    )
                    if (analytics) {
                        liquidityPool.analytics = {
                            fees24H: analytics.fee24H,
                            volume24H: analytics.volume24H,
                            tvl: analytics.tvl,
                            apr24H: analytics.apr24H,
                            liquidity: analytics.liquidity,
                        }
                    }
                    bot.activePosition.associatedLiquidityPool =
                liquidityPool
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
    }
}