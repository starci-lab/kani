import { FetchedPool } from "./types"
import { Network } from "@modules/common"

export interface FetchPoolsResponse {
    pools: Array<FetchedPool>
}

export interface IFetchService {
    fetchPools(params: FetchPoolsParams): Promise<FetchPoolsResponse>
}

export interface FetchPoolsParams {
    network?: Network
}