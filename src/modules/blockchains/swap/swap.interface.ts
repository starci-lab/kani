import { Network } from "@modules/common"
import { TokenId, TokenLike } from "@modules/databases"
import BN from "bn.js"
import { ActionResponse } from "../dexes"
import { SuiClient } from "@mysten/sui/client"
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions"
import { CoinArgument } from "../types"

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
    // amount in now optional, since sui require coin obj to swap rather then amountIn
    // specify amount in in order to swap by yourself
    amountIn?: BN,
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
    // transfer to user (sui only)
    transferCoinObjs?: boolean
    // input coin obj (sui only)
    inputCoin?: CoinArgument
}

export interface FlexibleInputSwapParams {
    tokenIn: TokenId,
    tokenOut: TokenId,
    tokens: Array<TokenLike>,
    network?: Network
    inputCoinArgs: Array<TransactionObjectArgument>
    slippage?: number
    txb?: Transaction
    suiClient?: SuiClient
}

export interface FlexibleInputSwapResponse {
    coinOutArg: TransactionObjectArgument
}