import { LiquidityPoolLike, TokenLike } from "@modules/databases"
import { FetchedPool } from "./types"
import { Network } from "@modules/common"

export interface FetchPoolsResponse {
    pools: Array<FetchedPool>
}

export interface IFetchService {
    fetchPools(params: FetchPoolsParams): Promise<FetchPoolsResponse>
}

export interface FetchPoolsParams {
    liquidityPools: Array<LiquidityPoolLike>,
    tokens: Array<TokenLike>,
    network?: Network
}