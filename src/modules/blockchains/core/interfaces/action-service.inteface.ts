import BN from "bn.js"
import { FetchedPool } from "./types"
import { ActionResponse } from "../types"
import { PositionLike, TokenId, TokenLike } from "@modules/databases"
import { ChainId, Network } from "@modules/common"
import { Transaction } from "@mysten/sui/transactions"

export interface ClosePositionParams {
    pool: FetchedPool
    position: PositionLike
    network?: Network
    chainId?: ChainId
    accountAddress: string
    priorityAOverB: boolean
    tokenAId: TokenId
    tokenBId: TokenId
    tokens: Array<TokenLike>
    // txb (sui only)
    txb?: Transaction
}

export interface OpenPositionParams {
    pool: FetchedPool
    // amount to add
    amount: BN
    priorityAOverB: boolean
    tokenAId: TokenId
    tokenBId: TokenId
    tokens: Array<TokenLike>
    network?: Network
    chainId?: ChainId
    accountAddress: string
    // txb (sui only)
    txb?: Transaction
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