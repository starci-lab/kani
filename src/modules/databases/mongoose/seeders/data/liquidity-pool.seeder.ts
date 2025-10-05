import { Injectable, Logger } from "@nestjs/common"
import { Seeder } from "nestjs-seeder"
import { Connection } from "mongoose"
import { ChainId, createObjectId, Network } from "@modules/common"
import { LiquidityPoolSchema } from "../../schemas"
import { InjectMongoose } from "../../mongoose.decorators"
import { DeepPartial } from "@modules/common"
import { DexId, LiquidityPoolId, TokenId } from "../../../enums"

const data: Array<DeepPartial<LiquidityPoolSchema>> = [
    {
        _id: createObjectId(LiquidityPoolId.CetusSuiIka02),
        displayId: LiquidityPoolId.CetusSuiIka02,
        dex: createObjectId(DexId.Cetus),
        poolAddress: "0xc23e7e8a74f0b18af4dfb7c3280e2a56916ec4d41e14416f85184a8aab6b7789",
        tokenA: createObjectId(TokenId.SuiIka),
        tokenB: createObjectId(TokenId.SuiNative),
        fee: 0.002,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        rewardTokens: [
            createObjectId(TokenId.SuiIka),
            createObjectId(TokenId.SuiCetus),
        ],
    },
    {
        _id: createObjectId(LiquidityPoolId.CetusSuiUsdc005),
        displayId: LiquidityPoolId.CetusSuiUsdc005,
        dex: createObjectId(DexId.Cetus),   
        poolAddress: "0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab",
        tokenA: createObjectId(TokenId.SuiUsdc),
        tokenB: createObjectId(TokenId.SuiNative),
        fee: 0.0005,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        rewardTokens: [
            createObjectId(TokenId.SuiCetus),
        ],
    },
    {
        displayId: LiquidityPoolId.TurbosIkaUsdc015,
        dex: createObjectId(DexId.Turbos),
        poolAddress: "0xdaa881332a4f57fe3776e2d3003701b53f83a34dc0dd9192c42ba1557c9a95a8",
        tokenA: createObjectId(TokenId.SuiIka),
        tokenB: createObjectId(TokenId.SuiUsdc),
        fee: 0.0015,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        rewardTokens: [
            createObjectId(TokenId.SuiIka),
            createObjectId(TokenId.SuiUsdc),
        ],
    },
    {
        displayId: LiquidityPoolId.TurbosDeepUsdc015,
        dex: createObjectId(DexId.Turbos),
        poolAddress: "0x198af6ff81028c6577e94465d534c4e2cfcbbab06a95724ece7011c55a9d1f5a",
        tokenA: createObjectId(TokenId.SuiDeep),
        tokenB: createObjectId(TokenId.SuiUsdc),
        fee: 0.0015,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        rewardTokens: [
            createObjectId(TokenId.SuiDeep),
            createObjectId(TokenId.SuiUsdc),
        ],
    },
    {
        displayId: LiquidityPoolId.CetusUsdcEth025,
        dex: createObjectId(DexId.Cetus),
        poolAddress: "0x9e59de50d9e5979fc03ac5bcacdb581c823dbd27d63a036131e17b391f2fac88",
        tokenA: createObjectId(TokenId.SuiUsdc),
        tokenB: createObjectId(TokenId.SuiEth),
        fee: 0.0025,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        rewardTokens: [
            createObjectId(TokenId.SuiCetus),
            createObjectId(TokenId.SuiNative),
        ],
    },
    {
        displayId: LiquidityPoolId.MomentumWalSui02,
        dex: createObjectId(DexId.Momentum),
        poolAddress: "0x919a34b9df1d7a56fa078ae6ddc6bd203e284974704d85721062d38ee3a6701a",
        tokenA: createObjectId(TokenId.SuiWalrus),
        tokenB: createObjectId(TokenId.SuiNative),
        fee: 0.002,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        rewardTokens: [
            createObjectId(TokenId.SuiXStakedSui),
            createObjectId(TokenId.SuiWalrus),
        ],
    },
    {
        displayId: LiquidityPoolId.MomentumSuiUsdc0175,
        dex: createObjectId(DexId.Momentum),
        poolAddress: "0x455cf8d2ac91e7cb883f515874af750ed3cd18195c970b7a2d46235ac2b0c388",
        tokenA: createObjectId(TokenId.SuiNative),
        tokenB: createObjectId(TokenId.SuiUsdc),
        fee: 0.00175,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        rewardTokens: [
            createObjectId(TokenId.SuiXStakedSui),
        ]
    },
]

@Injectable()
export class LiquidityPoolSeeder implements Seeder {
    private readonly logger = new Logger(LiquidityPoolSeeder.name)

    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
    ) {}

    public async seed(): Promise<void> {
        this.logger.debug("Seeding LP pools...")
        await this.drop()

        try {
            await this.connection
                .model<LiquidityPoolSchema>(LiquidityPoolSchema.name)
                .create(data)

            this.logger.log(`Seeded ${data.length} LP pools successfully`)
        } catch (error) {
            this.logger.error("Failed to seed LP pools", error.stack)
        }
    }

    async drop(): Promise<void> {
        this.logger.verbose("Dropping existing LP pools...")
        const result = await this.connection
            .model<LiquidityPoolSchema>(LiquidityPoolSchema.name)
            .deleteMany({})
        this.logger.log(`Dropped ${result.deletedCount ?? 0} LP pools`)
    }
}