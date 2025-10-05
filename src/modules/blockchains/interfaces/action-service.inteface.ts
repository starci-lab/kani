import BN from "bn.js"
import { FetchedPool } from "./types"
import { ActionResponse } from "../dexes"
import { PositionLike, TokenId, TokenSchema, UserLike } from "@modules/databases"
import { ChainId, Network } from "@modules/common"
import { Transaction } from "@mysten/sui/transactions"
import { SuiClient } from "@mysten/sui/client"

export interface ClosePositionParams {
    pool: FetchedPool
    position: PositionLike
    network?: Network
    chainId?: ChainId
    accountAddress: string
    priorityAOverB: boolean
    tokenAId: TokenId
    tokenBId: TokenId
    slippage?: number
    swapSlippage?: number
    // txb (sui only)
    txb?: Transaction
    // user to sign the tx
    user?: UserLike
    suiClient?: SuiClient
    stimulateOnly?: boolean
}

export interface OpenPositionParams {
    pool: FetchedPool
    // amount to add
    amount?: BN
    priorityAOverB: boolean
    tokenAId: TokenId
    tokenBId: TokenId
    network?: Network
    chainId?: ChainId
    accountAddress: string
    slippage?: number
    swapSlippage?: number
    requireZapEligible?: boolean
    stimulateOnly?: boolean
    // txb (sui only)
    txb?: Transaction
    // user to sign the tx
    user?: UserLike
    suiClient?: SuiClient
}

export interface ClosePositionResponse extends ActionResponse {
    suiTokenOuts?: Partial<Record<TokenId, BN>>
}

export interface SwapParams {
    pool: FetchedPool
    network?: Network
    accountAddress: string
    tokenInId: TokenId
    tokenOutId: TokenId
    amountIn: BN
    slippage?: number
    priceLimit?: number
    // user to sign the tx
    user?: UserLike
    suiClient?: SuiClient
}

export interface SuiFlexibleSwapParams {
    network?: Network
    txb?: Transaction
    accountAddress: string
    tokens: Array<TokenSchema>
    suiTokenIns: Partial<Record<TokenId, BN>>
    tokenOut: TokenId
    slippage?: number
    // user to sign the tx
    user?: UserLike
    suiClient?: SuiClient
    // deposit amount
    depositAmount: BN
    stimulateOnly?: boolean
}

export interface SuiFlexibleSwapResponse extends ActionResponse {
    receivedAmountOut: BN
    profitAmount: BN
}

export interface OpenPositionResponse extends ActionResponse {
    tickLower: number
    tickUpper: number
    liquidity: BN
    depositAmount: BN
    positionId: string
}

export interface IActionService {
    // close position
    closePosition(params: ClosePositionParams): Promise<ClosePositionResponse>
    // open position
    openPosition(params: OpenPositionParams): Promise<OpenPositionResponse>
}