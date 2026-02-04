import {
    Injectable,
} from "@nestjs/common"
import {
    ActivePositionAssociateService,
    BotSchema,
    InjectPrimaryMongoose,
    PositionSchema,
    PrimaryMemoryStorageService,
    UserSchema,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    ReservesWithFeesV2Request,
    ReservesWithFeesV2ResponseData,
} from "./reserves-with-fees-v2.dto"
import {
    VerifyAccessTokenResponse,
} from "@privy-io/node"
import {
    ActivePositionNotFoundException,
    BotNotFoundException,
    BotNotOwnedByUserException,
    LiquidityPoolNotFoundException,
    UserNotFoundException,
} from "@modules/exceptions"
import {
    ReservesWithFeesActionService,
} from "@modules/blockchains"

@Injectable()
export class ReservesWithFeesV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly reservesWithFeesActionService: ReservesWithFeesActionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly activePositionAssociateService: ActivePositionAssociateService,
    ) {}

    async reservesWithFeesV2(
        { botId }: ReservesWithFeesV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<ReservesWithFeesV2ResponseData> {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({
                privyUserId: response.user_id,
            })
        if (!user) {
            throw new UserNotFoundException({
                privyUserId: response.user_id,
            })
        }
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)
        if (!bot) {
            throw new BotNotFoundException({
                id: botId,
            })
        }
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException({
                id: botId,
                userId: user.id,
            })
        }
        await this.activePositionAssociateService.attachAssociatedPositionsToBotActivePositions([bot])
        await this.activePositionAssociateService.attachAssociatedLiquidityPoolToBotActivePositions([bot])
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
