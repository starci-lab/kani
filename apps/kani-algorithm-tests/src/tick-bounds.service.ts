import {
    Injectable, OnApplicationBootstrap 
} from "@nestjs/common"
import {
    TickMathService 
} from "@modules/blockchains"
import {
    BotSchema,
    PrimaryMemoryStorageService, 
    TokenId
} from "@modules/databases"
import {
    InjectPrimaryMongoose 
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import BN from "bn.js"
import {
    sleep 
} from "@utils"
import {
    Decimal 
} from "decimal.js"

@Injectable()
export class TickBoundsService implements OnApplicationBootstrap {
    constructor(
        private readonly tickMathService: TickMathService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    onApplicationBootstrap() {
        this.getTickBounds()
    }

    private async getTickBounds() {
        await sleep(1000)
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            displayId: {
                $eq: TokenId.SuiIka,
            }
        })
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            displayId: {
                $eq: TokenId.SuiUsdc,
            }
        })
        if (!targetToken || !quoteToken) {
            throw new Error("Target or quote token not found")
        }
        const { tickLower, tickUpper, utilizationPercentage } = await this.tickMathService.findOptimalTickRange({
            targetBalanceAmount: new BN(1_000_000_000_000), // 1000 IKA
            quoteBalanceAmount: new BN(1_000_000_000), // 1000 USDC
            tickCurrent: new BN(402),
            tickSpacing: new Decimal(40),
            tickMultiplier: new Decimal(20),
        })
        console.log(`tickLower: ${tickLower.toString()}, tickUpper: ${tickUpper.toString()}, utilizationPercentage: ${utilizationPercentage.toString()}`)
    }
}
