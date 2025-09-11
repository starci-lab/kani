import { Network } from "@modules/common"
import { TokenId, TokenLike } from "@modules/databases"
import BN from "bn.js"

export interface ISwapService {
    quote(params: QuoteParams): Promise<QuoteResponse>
    swap(params: SwapParams): Promise<SwapResponse>
}

export interface QuoteParams {
    tokenIn: TokenId,
    tokenOut: TokenId,
    amountIn: BN,
    tokens: Array<TokenLike>,
    network?: Network
}

export enum SuiRouterId {
    Cetus = "cetus",
    SevenK = "sevenk",
}

export interface QuoteResponse {
    amountOut: BN,
    // additional serialized data
    serializedData?: string
}

export interface SwapParams {
    tokenIn: TokenId,
    tokenOut: TokenId,
    amountIn: BN,
    tokens: Array<TokenLike>,
    slippage?: number,
    network?: Network
    routerId?: SuiRouterId,
    fromAddress: string,
    recipientAddress?: string,
    // serialized data
    serializedData?: string
    // tx
    serializedTx: string
}

export interface SwapResponse {
    txPayload: string,
}