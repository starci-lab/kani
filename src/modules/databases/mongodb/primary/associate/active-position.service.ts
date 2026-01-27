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

@Injectable()
export class ActivePositionAssociateService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

    /**
   * Attach associated Position data into each bot.activePosition.
   */
    async attachAssociatedPositionsToBotActivePositions(
        bots: Array<BotSchema>,
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
        bots: Array<BotSchema>,
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

        for (const bot of botsWithActivePosition) {
            const liquidityPoolId =
                bot.activePosition.liquidityPool.toString()
            const liquidityPool =
                liquidityPoolMap.get(liquidityPoolId)

            if (!liquidityPool) {
                throw new LiquidityPoolNotFoundException({
                    id: liquidityPoolId,
                })
            }
            bot.activePosition.associatedLiquidityPool =
                liquidityPool
        }
    }
}