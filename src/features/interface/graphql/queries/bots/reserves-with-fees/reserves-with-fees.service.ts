import {
    Injectable,
} from "@nestjs/common"
import {
    ActivePositionAssociateService,
    BotSchema,
    InjectPrimaryMongoose,
    PositionSchema,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    ReservesWithFeesRequest,
    ReservesWithFeesResponseData,
} from "./graphql-types"
import {
    UserJwtLike,
} from "@modules/passport"
import {
    ActivePositionNotFoundException,
    BotNotFoundException,
    BotNotOwnedByUserException,
    LiquidityPoolNotFoundException,
} from "@modules/exceptions"
import {
    LiquidityPoolStateService,
    ReservesWithFeesActionService,
} from "@modules/blockchains"

@Injectable()
export class ReservesWithFeesService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly reservesWithFeesActionService: ReservesWithFeesActionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly activePositionAssociateService: ActivePositionAssociateService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
    ) {}

    async reservesWithFees(
        { botId }: ReservesWithFeesRequest,
        userLike: UserJwtLike,
    ): Promise<ReservesWithFeesResponseData> {
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)
        if (!bot) {
            throw new BotNotFoundException({
                id: botId,
            })
        }
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException({
                id: botId,
                userId: userLike.id,
            })
        }
        await this.activePositionAssociateService.attachAssociatedPositionsToBotActivePositions({
            bots: [bot] 
        })
        await this.activePositionAssociateService.attachAssociatedLiquidityPoolToBotActivePositions({
            bots: [bot] 
        })
        const activePosition = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .findOne({
                bot: botId,
                isActive: true,
            })
        if (
            !activePosition
            || activePosition.bot.toString() !== botId
            || !activePosition.isActive
        ) {
            throw new ActivePositionNotFoundException({
                botId,
            })
        }
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolMap.get(activePosition.liquidityPool.toString())
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: activePosition.liquidityPool.toString(),
            })
        }
        const state = await this.liquidityPoolStateService.getState(liquidityPool)
        const {
            reserveA,
            reserveB,
            feeA,
            feeB,
            rewards,
            snapshotAt,
        } = await this.reservesWithFeesActionService.reservesWithFees({
            bot,
            liquidityPool,
            state,
        })
        const rewardsAsNumbers = Object.fromEntries(
            Object.entries(rewards).map(([k,
                v]) => [k,
                v.toNumber()]),
        )
        return {
            reserveA: reserveA.toNumber(),
            reserveB: reserveB.toNumber(),
            feeA: feeA.toNumber(),
            feeB: feeB.toNumber(),
            rewards: rewardsAsNumbers,
            snapshotAt: snapshotAt.toDate(),
        }
    }
}
