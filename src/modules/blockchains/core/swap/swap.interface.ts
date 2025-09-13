import { Network } from "@modules/common"
import { TokenId, TokenLike } from "@modules/databases"
import BN from "bn.js"
import { ActionResponse } from "../types"
import { Transaction } from "@mysten/sui/transactions"

export interface ISwapService {
    quote(params: QuoteParams): Promise<QuoteResponse>
    swap(params: SwapParams): Promise<ActionResponse>
}

export interface QuoteParams {
    tokenIn: TokenId,
    tokenOut: TokenId,
    amountIn: BN,
    tokens: Array<TokenLike>,
    network?: Network
}

export enum RouterId {
    Cetus = "cetus",
    SevenK = "sevenk",
}

export interface QuoteResponse {
    amountOut: BN,
    quoteData?: unknown
    routerId: RouterId,
}

export interface SwapParams {
    tokenIn: TokenId,
    tokenOut: TokenId,
    amountIn: BN,
    tokens: Array<TokenLike>,
    slippage?: number,
    network?: Network
    routerId?: RouterId,
    fromAddress: string,
    recipientAddress?: string,
    // quote data (if required)
    quoteData?: unknown
    // txb (sui only)
    txb?: Transaction
}