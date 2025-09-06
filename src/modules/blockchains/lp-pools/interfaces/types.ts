import { TokenSchema } from "@modules/databases"

export interface FetchedPool {
    id: string
    currentTick: number
    currentSqrtPrice: number
    tickSpacing: number
    token0: TokenSchema
    token1: TokenSchema
    rewardTokens: Array<TokenSchema>
}

export interface FetchedPosition {
    id: string
    tickLowerIndex: number
    tickUpperIndex: number
    liquidity: string
}