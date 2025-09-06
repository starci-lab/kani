import { FetchedPool, FetchedPosition } from "./types"
import { Network } from "@modules/common"

export interface ActionResponse {
    txHash: string
}

export interface ClosePositionParams {
    pool: FetchedPool
    position: FetchedPosition
    network?: Network
}

export interface OpenPositionParams {
    pool: FetchedPool
    network?: Network
}

export interface IActionService {
    // close position
    closePosition(params: ClosePositionParams): Promise<ActionResponse>
    // open position
    openPosition(params: OpenPositionParams): Promise<ActionResponse>
}