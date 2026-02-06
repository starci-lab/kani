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
} from "./reserves-with-fees.dto"
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
        await this.activePositionAssociateService.attachAssociatedPositionsToBotActivePositions({ bots: [bot] })
        await this.activePositionAssociateService.attachAssociatedLiquidityPoolToBotActivePositions({ bots: [bot] })
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
