import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    ReservesRequest,
    ReservesResponseData,
} from "./reserves.dto"
import {
    UserJwtLike 
} from "@modules/passport"
import { 
    ActivePositionNotFoundException, 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    LiquidityPoolNotFoundException,
} from "@modules/exceptions"
import {
    ReservesOrchestratorService 
} from "@modules/blockchains"

@Injectable()
export class ReservesService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly reservesOrchestratorService: ReservesOrchestratorService,
    ) { }

    async reserves(
        {
            botId,
            activePositionId,
        }: ReservesRequest,
        userLike: UserJwtLike,
    ): Promise<ReservesResponseData> {
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(botId)
        if (!bot) {
            throw new BotNotFoundException({
                id: botId,
            })
        }
        // check if the bot is owned by the user
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException({
                id: botId,
                userId: userLike.id,
            })
        }
        // check if the active position exists and is owned by the bot
        const activePosition = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .findById(activePositionId)
        if (
            !activePosition 
            || activePosition.bot.toString() !== botId
            || !activePosition.isActive
        ) {
            throw new ActivePositionNotFoundException({
                botId,
            })
        }
        // retrieve the liquidity pool
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne(
            {
                id: {
                    $eq: activePosition.liquidityPool.toString(),
                },
            }
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: activePosition.liquidityPool.toString(),
            })
        }
        const { reserveA, reserveB, snapshotAt } = await this
            .reservesOrchestratorService
            .reserves(
                {
                    bot,
                    liquidityPool,
                }
            )
        return {
            reserveA: reserveA.toNumber(),
            reserveB: reserveB.toNumber(),
            snapshotAt: snapshotAt.toDate(),
        }
    }
}
