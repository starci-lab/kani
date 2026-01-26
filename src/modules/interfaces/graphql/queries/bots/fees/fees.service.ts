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
    FeesRequest,
    FeesResponseData,
} from "./fees.dto"
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
    FeesOrchestratorService 
} from "@modules/blockchains"

@Injectable()
export class FeesService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly feesOrchestratorService: FeesOrchestratorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

    async fees(
        {
            botId,
            activePositionId,
        }: FeesRequest,
        userLike: UserJwtLike,
    ): Promise<FeesResponseData> {
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
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException({
                id: botId,
                userId: userLike.id,
            })
        }
        // get the active position
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
        // get the liquidity pool
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
            id: {
                $eq: activePosition.liquidityPool.toString(),
            },
        })
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: activePosition.liquidityPool.toString(),
            })
        }
        // get the fees for the bot
        const { feeA, feeB, snapshotAt } = await this.feesOrchestratorService.fees({
            bot, 
            liquidityPool 
        })
        return {
            tokenA: feeA.toNumber(),
            tokenB: feeB.toNumber(),
            lastFetchedAt: snapshotAt.toDate(),
            lastSnapshotAt: snapshotAt.toDate(),
        }
    }
}
