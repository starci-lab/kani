import { ChainId, Network } from "@modules/common"
import { DexId, LiquidityPoolId, TokenId } from "@modules/databases/enums"
import { LiquidityPoolLike } from "@modules/databases/types"

export const liquidityPoolData: Array<LiquidityPoolLike> = [
    {
        displayId: LiquidityPoolId.CetusSuiIka02,
        dexId: DexId.Cetus,
        poolAddress: "0xc23e7e8a74f0b18af4dfb7c3280e2a56916ec4d41e14416f85184a8aab6b7789",
        tokenAId: TokenId.SuiIka,
        tokenBId: TokenId.SuiUsdc,
        fee: 0.002,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
    },
    {
        displayId: LiquidityPoolId.CetusSuiUsdc005,
        dexId: DexId.Cetus,
        poolAddress: "0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab",
        tokenAId: TokenId.SuiUsdc,
        tokenBId: TokenId.SuiCetus,
        fee: 0.0005,
        network: Network.Mainnet,
        chainId: ChainId.Sui,
    },
]


