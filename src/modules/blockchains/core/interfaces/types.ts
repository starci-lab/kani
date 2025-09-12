import { LiquidityPoolLike, TokenLike } from "@modules/databases"
import BN from "bn.js"

export interface FetchedPool {
    poolAddress: string
    currentTick: number
    currentSqrtPrice: BN
    tickSpacing: number
    liquidityPool: LiquidityPoolLike
    token0: TokenLike
    token1: TokenLike
    liquidity: number
    fee: number
    rewardTokens: Array<TokenLike>
}

export interface FetchedPosition {
    id: string
    tickLowerIndex: number
    tickUpperIndex: number
    liquidity: string
}