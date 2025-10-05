import { Rewarder } from "@mmt-finance/clmm-sdk/dist/types"
import { ClmmPool } from "@flowx-finance/sdk"
import { LiquidityPoolId, LiquidityPoolSchema, TokenSchema } from "@modules/databases"
import BN from "bn.js"

export interface FetchedPool {
    poolAddress: string
    displayId: LiquidityPoolId
    currentTick: number
    currentSqrtPrice: BN
    tickSpacing: number
    liquidityPool: LiquidityPoolSchema
    token0: TokenSchema
    token1: TokenSchema
    liquidity: BN
    fee: number
    rewardTokens: Array<TokenSchema>
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