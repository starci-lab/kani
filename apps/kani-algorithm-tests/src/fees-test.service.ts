import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { CetusFeesService, LiquidityPoolStateService } from "@modules/blockchains"
import { BotSchema, DexId, InjectPrimaryMongoose, LiquidityPoolId, PrimaryMemoryStorageService } from "@modules/databases"
import { Connection } from "mongoose"

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
                accountAddress: "0xb36ba968411da3eda4f9703010e602a9493398d293503483add061f0143d3212",
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
