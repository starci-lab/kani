import { TokenLike } from "@modules/databases"

export interface FetchedPool {
    id: string
    currentTick: number
    currentSqrtPrice: number
    tickSpacing: number
    token0: TokenLike
    token1: TokenLike
    fee: number
    rewardTokens: Array<TokenLike>
}

export interface FetchedPosition {
    id: string
    tickLowerIndex: number
    tickUpperIndex: number
    liquidity: string
}