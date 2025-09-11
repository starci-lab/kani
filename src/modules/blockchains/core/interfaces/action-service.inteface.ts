import { FetchedPool, FetchedPosition } from "./types"
import { Network } from "@modules/common"

export interface ActionResponse {
    txHash: string
}

export interface ActionParams {
    network?: Network
}

export interface ClosePositionParams extends ActionParams {
    pool: FetchedPool
    position: FetchedPosition
}

export interface OpenPositionParams extends ActionParams {
    pool: FetchedPool
}

export interface IActionService {
    // close position
    closePosition(params: ClosePositionParams): Promise<ActionResponse>
    // open position
    openPosition(params: OpenPositionParams): Promise<ActionResponse>
}