import { Rewarder } from "@mmt-finance/clmm-sdk/dist/types"
import { ClmmPool } from "@flowx-finance/sdk"
import { LiquidityPoolId, LiquidityPoolLike, TokenLike } from "@modules/databases"
import BN from "bn.js"

export interface FetchedPool {
    poolAddress: string
    displayId: LiquidityPoolId
    currentTick: number
    currentSqrtPrice: BN
    tickSpacing: number
    liquidityPool: LiquidityPoolLike
    token0: TokenLike
    token1: TokenLike
    liquidity: BN
    fee: number
    rewardTokens: Array<TokenLike>
    //extra required obj
    mmtRewarders?: Array<Rewarder>
    //flowx clmm pool
    flowXClmmPool?: ClmmPool
}

export interface FetchedPosition {
    id: string
    tickLowerIndex: number
    tickUpperIndex: number
    liquidity: string
}