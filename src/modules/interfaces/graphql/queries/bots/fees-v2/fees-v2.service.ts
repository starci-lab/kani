import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema,
    PrimaryMemoryStorageService,
    UserSchema,
    ActivePositionAssociateService,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    FeesV2Request,
    FeesV2ResponseData,
} from "./fees-v2.dto"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import { 
    ActivePositionNotFoundException, 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    LiquidityPoolNotFoundException,
    UserNotFoundException,
} from "@modules/exceptions"
import {
    FeesOrchestratorService 
} from "@modules/blockchains"

@Injectable()
export class FeesV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly feesOrchestratorService: FeesOrchestratorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly activePositionAssociateService: ActivePositionAssociateService,
    ) { }

    async feesV2(
        {
            botId,
        }: FeesV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<FeesV2ResponseData> {
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
        // attach the associated position to the active position
        await this.activePositionAssociateService.attachAssociatedPositionsToBotActivePositions([bot])
        await this.activePositionAssociateService.attachAssociatedLiquidityPoolToBotActivePositions([bot])
        // get the active position
        const activePosition = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .findOne({
                bot: botId,
                isActive: true,
            })
        if (!activePosition 
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
            bot, liquidityPool 
        })
        return {
            feeA: feeA.toNumber(),
            feeB: feeB.toNumber(),
            snapshotAt: snapshotAt.toDate(),
        }
    }
}

