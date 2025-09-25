import { ChainId, Network, TokenType } from "@modules/common"
import { DexId, LiquidityPoolId, TokenId } from "@modules/databases/enums"
import { LiquidityPoolLike } from "@modules/databases/types"

export const liquidityPoolData: Array<LiquidityPoolLike> = [
    {
        displayId: LiquidityPoolId.CetusSuiIka02,
        dexId: DexId.Cetus,
        poolAddress: "0xc23e7e8a74f0b18af4dfb7c3280e2a56916ec4d41e14416f85184a8aab6b7789",
        tokenAId: TokenId.SuiIka,
        tokenBId: TokenId.SuiNative,
        priorityAOverB: true,
        fee: 0.002,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        farmTokenTypes: [TokenType.Native],
        rewardTokenIds: [
            TokenId.SuiIka,
            TokenId.SuiCetus,
        ],
    },
    {
        displayId: LiquidityPoolId.CetusSuiUsdc005,
        dexId: DexId.Cetus,
        poolAddress: "0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab",
        tokenAId: TokenId.SuiUsdc,
        tokenBId: TokenId.SuiNative,
        fee: 0.0005,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        farmTokenTypes: [TokenType.Native, TokenType.StableUsdc],
        rewardTokenIds: [
            TokenId.SuiCetus
        ]
    },
    // {
    //     displayId: LiquidityPoolId.TurbosIkaUsdc015,
    //     dexId: DexId.Turbos,
    //     poolAddress: "0xdaa881332a4f57fe3776e2d3003701b53f83a34dc0dd9192c42ba1557c9a95a8",
    //     tokenAId: TokenId.SuiIka,
    //     tokenBId: TokenId.SuiUsdc,
    //     fee: 0.0015,
    //     priorityAOverB: false,
    //     network: Network.Mainnet,
    //     chainId: ChainId.Sui,
    //     farmTokenTypes: [TokenType.StableUsdc],
    //     rewardTokenIds: [
    //         TokenId.SuiIka,
    //         TokenId.SuiUsdc
    //     ]
    // },
    {
        displayId: LiquidityPoolId.TurbosDeepUsdc015,
        dexId: DexId.Turbos,
        poolAddress: "0x198af6ff81028c6577e94465d534c4e2cfcbbab06a95724ece7011c55a9d1f5a",
        tokenAId: TokenId.SuiDeep,
        tokenBId: TokenId.SuiUsdc,
        priorityAOverB: false,
        fee: 0.0015,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        farmTokenTypes: [TokenType.StableUsdc],
        rewardTokenIds: [
            TokenId.SuiDeep,
            TokenId.SuiUsdc
        ]
    },
    {
        displayId: LiquidityPoolId.CetusUsdcEth025,
        dexId: DexId.Cetus,
        poolAddress: "0x9e59de50d9e5979fc03ac5bcacdb581c823dbd27d63a036131e17b391f2fac88",
        tokenAId: TokenId.SuiUsdc,
        tokenBId: TokenId.SuiEth,
        priorityAOverB: true,
        fee: 0.0025,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        farmTokenTypes: [TokenType.StableUsdc],
        rewardTokenIds: [
            TokenId.SuiCetus,
            TokenId.SuiNative
        ]
    },
    {
        displayId: LiquidityPoolId.MomentumWalSui02,
        dexId: DexId.Momentum,
        poolAddress: "0x919a34b9df1d7a56fa078ae6ddc6bd203e284974704d85721062d38ee3a6701a",
        tokenAId: TokenId.SuiWalrus,
        tokenBId: TokenId.SuiNative,
        priorityAOverB: true,
        fee: 0.002,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        farmTokenTypes: [TokenType.Native],
        rewardTokenIds: [
            TokenId.SuiXStakedSui,
            TokenId.SuiWalrus
        ]
    },
    {
        displayId: LiquidityPoolId.MomentumSuiUsdc0175,
        dexId: DexId.Momentum,
        poolAddress: "0x455cf8d2ac91e7cb883f515874af750ed3cd18195c970b7a2d46235ac2b0c388",
        tokenAId: TokenId.SuiNative,
        tokenBId: TokenId.SuiUsdc,
        fee: 0.00175,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
        farmTokenTypes: [
            TokenType.StableUsdc, 
            TokenType.Native
        ],
        rewardTokenIds: [
            TokenId.SuiXStakedSui,
        ]
    },
]