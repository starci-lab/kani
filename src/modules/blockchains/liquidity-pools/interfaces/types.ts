import { LiquidityPoolLike, TokenLike } from "@modules/databases"

export interface FetchedPool {
    id: string
    currentTick: number
    currentSqrtPrice: number
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