import type {
    TokenId 
} from "../enums"

/** Metadata for swap transaction. */
export interface SwapTransactionMetadata {
    tokenIn: TokenId
    tokenOut: TokenId
    amountIn: string
    amountOut?: string
}
