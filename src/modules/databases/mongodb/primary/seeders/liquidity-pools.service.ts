import { InjectPrimaryMongoose } from "../mongodb.decorators"
import { DexId, LiquidityPoolId, LiquidityPoolType, TokenId } from "../enums"
import { LiquidityPoolSchema } from "../schemas"
import { DeepPartial, ChainId, Network } from "@typedefs"
import { createObjectId } from "@utils"
import { Seeder } from "nestjs-seeder"
import { Connection } from "mongoose"
import { Injectable } from "@nestjs/common"

@Injectable()
export class LiquidityPoolsService implements Seeder {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }
    async seed(): Promise<void> {
        await this.connection.model<LiquidityPoolSchema>(LiquidityPoolSchema.name).create(data)
    }
    async drop(): Promise<void> {
        await this.connection.model<LiquidityPoolSchema>(LiquidityPoolSchema.name).deleteMany({})
    }
}
export const data: Array<DeepPartial<LiquidityPoolSchema>> = [
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
        type: LiquidityPoolType.Clmm,
        rewardTokens: [
            createObjectId(TokenId.SuiIka),
            createObjectId(TokenId.SuiCetus),
        ],
        tickSpacing: 1000,
        tickMultiplier: 1,
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
        type: LiquidityPoolType.Clmm,
        rewardTokens: [
            createObjectId(TokenId.SuiCetus),
        ],
        tickSpacing: 1000,
    },
    {
        _id: createObjectId(LiquidityPoolId.TurbosIkaUsdc015),
        displayId: LiquidityPoolId.TurbosIkaUsdc015,
        dex: createObjectId(DexId.Turbos),
        poolAddress: "0xdaa881332a4f57fe3776e2d3003701b53f83a34dc0dd9192c42ba1557c9a95a8",
        tokenA: createObjectId(TokenId.SuiIka),
        tokenB: createObjectId(TokenId.SuiUsdc),
        fee: 0.0015,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        type: LiquidityPoolType.Clmm,
        rewardTokens: [
            createObjectId(TokenId.SuiIka),
            createObjectId(TokenId.SuiUsdc),
        ],
        tickSpacing: 1000,
        tickMultiplier: 1,
    },
    {
        _id: createObjectId(LiquidityPoolId.TurbosDeepUsdc015),
        displayId: LiquidityPoolId.TurbosDeepUsdc015,
        dex: createObjectId(DexId.Turbos),
        poolAddress: "0x198af6ff81028c6577e94465d534c4e2cfcbbab06a95724ece7011c55a9d1f5a",
        tokenA: createObjectId(TokenId.SuiDeep),
        tokenB: createObjectId(TokenId.SuiUsdc),
        fee: 0.0015,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        type: LiquidityPoolType.Clmm,
        rewardTokens: [
            createObjectId(TokenId.SuiDeep),
            createObjectId(TokenId.SuiUsdc),
        ],
        tickSpacing: 1000,
        tickMultiplier: 1,
    },
    {
        _id: createObjectId(LiquidityPoolId.CetusUsdcEth025),
        displayId: LiquidityPoolId.CetusUsdcEth025,
        dex: createObjectId(DexId.Cetus),
        poolAddress: "0x9e59de50d9e5979fc03ac5bcacdb581c823dbd27d63a036131e17b391f2fac88",
        tokenA: createObjectId(TokenId.SuiUsdc),
        tokenB: createObjectId(TokenId.SuiEth),
        fee: 0.0025,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        type: LiquidityPoolType.Clmm,
        rewardTokens: [
            createObjectId(TokenId.SuiCetus),
            createObjectId(TokenId.SuiNative),
        ],
        tickSpacing: 1000,
    },
    {
        _id: createObjectId(LiquidityPoolId.MomentumWalSui02),
        displayId: LiquidityPoolId.MomentumWalSui02,
        dex: createObjectId(DexId.Momentum),
        poolAddress: "0x919a34b9df1d7a56fa078ae6ddc6bd203e284974704d85721062d38ee3a6701a",
        tokenA: createObjectId(TokenId.SuiWalrus),
        tokenB: createObjectId(TokenId.SuiNative),
        fee: 0.002,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        type: LiquidityPoolType.Clmm,
        rewardTokens: [
            createObjectId(TokenId.SuiXStakedSui),
            createObjectId(TokenId.SuiWalrus),
        ],
        tickSpacing: 1000,
    },
    {
        _id: createObjectId(LiquidityPoolId.MomentumSuiUsdc0175),
        displayId: LiquidityPoolId.MomentumSuiUsdc0175,
        dex: createObjectId(DexId.Momentum),
        poolAddress: "0x455cf8d2ac91e7cb883f515874af750ed3cd18195c970b7a2d46235ac2b0c388",
        tokenA: createObjectId(TokenId.SuiNative),
        tokenB: createObjectId(TokenId.SuiUsdc),
        fee: 0.00175,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        type: LiquidityPoolType.Clmm,
        rewardTokens: [
            createObjectId(TokenId.SuiXStakedSui),
        ],
        tickSpacing: 1000,
    },
    {
        _id: createObjectId(LiquidityPoolId.RaydiumSolUsdc004),
        displayId: LiquidityPoolId.RaydiumSolUsdc004,
        dex: createObjectId(DexId.Raydium),
        poolAddress: "3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv",
        tokenA: createObjectId(TokenId.SolNative),
        tokenB: createObjectId(TokenId.SolUsdc),
        fee: 0.0004,
        network: Network.Mainnet,
        chainId: ChainId.Solana,
        type: LiquidityPoolType.Clmm,
        tickSpacing: 1,
        tickMultiplier: 200,
        metadata: {
            programAddress: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
            tokenVault0: "4ct7br2vTPzfdmY3S5HLtTxcGSBfn6pnw98hsS6v359A",
            tokenVault1: "5it83u57VRrVgc51oNV19TTmAJuffPx5GtGwQr7gQNUo",
            rewardVaults: [
                {
                    tokenId: TokenId.SolRay,
                    vaultAddress: "HsBUudV9Y2Z2dJTieWFgK3zhrpX4ELvnfHcAwSBVqDGX",
                }
            ]
        },
        rewardTokens: [
            createObjectId(TokenId.SolRay),
        ],
    },
    {
        _id: createObjectId(LiquidityPoolId.RaydiumSolUsdt001),
        displayId: LiquidityPoolId.RaydiumSolUsdt001,
        dex: createObjectId(DexId.Raydium),
        poolAddress: "3nMFwZXwY1s1M5s8vYAHqd4wGs4iSxXE4LRoUMMYqEgF",
        tokenA: createObjectId(TokenId.SolNative),
        tokenB: createObjectId(TokenId.SolUsdt),
        fee: 0.0001,
        type: LiquidityPoolType.Clmm,
        network: Network.Mainnet,
        chainId: ChainId.Solana,
        rewardTokens: [
            createObjectId(TokenId.SolRay),
        ],
        tickSpacing: 1,
        tickMultiplier: 200,
    },
    {
        _id: createObjectId(LiquidityPoolId.OrcaSolUsdc004),
        displayId: LiquidityPoolId.OrcaSolUsdc004,
        dex: createObjectId(DexId.Orca),
        poolAddress: "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
        tokenA: createObjectId(TokenId.SolNative),
        tokenB: createObjectId(TokenId.SolUsdc),
        fee: 0.0004,
        type: LiquidityPoolType.Clmm,
        network: Network.Mainnet,
        chainId: ChainId.Solana,
        tickSpacing: 4,
        tickMultiplier: 50,
    },
    {
        _id: createObjectId(LiquidityPoolId.MeteoraSolUsdcBinStep4),
        displayId: LiquidityPoolId.MeteoraSolUsdcBinStep4,
        dex: createObjectId(DexId.Meteora),
        poolAddress: "5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6",
        tokenA: createObjectId(TokenId.SolNative),
        tokenB: createObjectId(TokenId.SolUsdc),
        fee: 0.0004,
        type: LiquidityPoolType.Dlmm,
        binStep: 4,
        binOffset: 10,
        metadata: {
            programAddress: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
        },
    },
]