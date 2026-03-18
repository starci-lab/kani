import {
    Injectable,
    OnApplicationBootstrap,
} from "@nestjs/common"
import {
    ReservesWithFeesActionService,
} from "@modules/blockchains"
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

@Injectable()
export class FeesTestService implements OnApplicationBootstrap {
    constructor(
        private readonly reservesWithFeesOrchestratorService: ReservesWithFeesOrchestratorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly activePositionAssociateService: ActivePositionAssociateService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    onApplicationBootstrap() {
        this.testReservesWithFees()
    }

    private async testReservesWithFees() {
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findOne({
                accountAddress: "0xb3bfefc489424c473174331f69506d4d73262816d2ea8c1ba6c357ab1c59dfc7",
            })
        if (!bot) {
            throw new Error("Bot not found")
        }
        await this.activePositionAssociateService.attachAssociatedPositionsToBotActivePositions([bot])
        await this.activePositionAssociateService.attachAssociatedLiquidityPoolToBotActivePositions([bot])
        const activePosition = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .findOne({
                bot: bot.id,
                isActive: true,
            })
        if (!activePosition || activePosition.bot.toString() !== bot.id || !activePosition.isActive) {
            throw new Error("Active position not found")
        }
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
            id: {
                $eq: activePosition.liquidityPool.toString(),
            },
        })
        if (!liquidityPool) {
            throw new Error("Liquidity pool not found")
        }
        const result = await this.reservesWithFeesOrchestratorService.reservesWithFees({
            bot,
            liquidityPool,
        })
    }
}
