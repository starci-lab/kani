import BN from "bn.js"
import { FetchedPool } from "./types"
import { ActionResponse } from ".."
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
    slippage?: number
    swapSlippage?: number
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
    slippage?: number
    swapSlippage?: number
    // txb (sui only)
    txb?: Transaction
}

export interface ClosePositionResponse extends ActionResponse {
    nft: string
}

export interface ForceSwapParams {
    pool: FetchedPool
    network?: Network
    txb: Transaction
    accountAddress: string
    priorityAOverB: boolean
    tokenAId: TokenId
    tokenBId: TokenId
    tokens: Array<TokenLike>
    slippage?: number
    pnlAmount: BN
}

export interface SwapParams {
    pool: FetchedPool
    network?: Network
    accountAddress: string
    tokenInId: TokenId
    tokenOutId: TokenId
    tokens: Array<TokenLike>
    amountIn: BN
    slippage?: number
    priceLimit?: number
}

export interface IActionService {
    // close position
    closePosition(params: ClosePositionParams): Promise<ActionResponse>
    // open position
    openPosition(params: OpenPositionParams): Promise<ActionResponse>
    // swap tokens
    swap?(params: SwapParams): Promise<ActionResponse>
}