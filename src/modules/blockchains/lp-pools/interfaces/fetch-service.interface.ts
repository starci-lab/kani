import { TokenId } from "@modules/databases"
import { FetchedPool } from "./types"

export interface FetchPoolsResponse {
    pools: Array<FetchedPool>
}

export interface IFetchService {
    fetchPools(tokenIds: Array<TokenId>): Promise<FetchPoolsResponse>
}