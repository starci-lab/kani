import {
    LiquidityPoolId, 
    TokenId
} from "@modules/databases"

/**
 * Close Position Transaction Executed Message
 */
export interface ClosePositionTransactionExecutedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Transaction Failed Message
 */
export interface ClosePositionTransactionFailedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Liquidity Pool Fetched Error Message
 */
export interface LiquidityPoolFetchedErrorMessage {
    liquidityPoolId: LiquidityPoolId
    error: string
}

/**
 * Liquidity Pool WS Error Message
 */
export interface LiquidityPoolWsErrorMessage {
    liquidityPoolId: LiquidityPoolId
    error: string
}

/**
 * Open Position Executed Message
 */
export interface OpenPositionTransactionExecutedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Transaction Failed Message
 */
export interface OpenPositionTransactionFailedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Swap Transaction Executed Message
 */
export interface SwapTransactionExecutedMessage {
    botId: string
    txHash: string
    tokenIn: TokenId
    tokenOut: TokenId
}

/**
 * Swap Transaction Failed Message
 */
export interface SwapTransactionFailedMessage {
    botId: string
    txHash: string
    tokenIn: TokenId
    tokenOut: TokenId
    error: string
}