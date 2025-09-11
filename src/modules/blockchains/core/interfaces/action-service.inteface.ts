import BN from "bn.js"
import { FetchedPool } from "./types"
import { ChainId, Network } from "@modules/common"
import { ActionResponse } from "../types"
import { PositionLike } from "@modules/databases"
import { Transaction } from "@mysten/sui/transactions"

export interface ActionParams {
    network?: Network
    chainId?: ChainId
    // txb (sui only)
    txb?: Transaction
}

export interface ClosePositionParams extends ActionParams {
    pool: FetchedPool
    position: PositionLike
    // user who burn the NFT
    fromAddress: string
}

export interface OpenPositionParams extends ActionParams {
    pool: FetchedPool
    // amount to add
    amountA: BN
    amountB: BN
    // user who receive the NFT
    toAddress: string
    // fees
    fee?: number
}

export interface ClosePositionResponse extends ActionResponse {
    nft: string
}

export interface IActionService {
    // close position
    closePosition(params: ClosePositionParams): Promise<ActionResponse>
    // open position
    openPosition(params: OpenPositionParams): Promise<ActionResponse>
}