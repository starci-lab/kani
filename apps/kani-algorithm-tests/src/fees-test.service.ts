import {
    Injectable, OnApplicationBootstrap 
} from "@nestjs/common"
import {
    CetusFeesService, LiquidityPoolStateService 
} from "@modules/blockchains"
import {
    BotSchema, InjectPrimaryMongoose, LiquidityPoolId, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    Connection 
} from "mongoose"

@Injectable()
export class FeesTestService implements OnApplicationBootstrap {
    constructor(
        private readonly cetusFeesService: CetusFeesService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    onApplicationBootstrap() {
        this.testCetusFees()
    }

    private async testCetusFees() {
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findOne(
            {
                accountAddress: "0xb3bfefc489424c473174331f69506d4d73262816d2ea8c1ba6c357ab1c59dfc7",
            }
        )
        if (!bot) {
            throw new Error("Bot not found")
        }
        const fees = await this.cetusFeesService.fees({
            bot,
            liquidityPoolId: LiquidityPoolId.CetusUsdcSui005,
            state: await this.liquidityPoolStateService.getState(LiquidityPoolId.CetusUsdcSui005),
        })
        console.log(fees)
    }
}
