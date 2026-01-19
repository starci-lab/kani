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

/**
 * Google Drive File Uploaded Message
 */
export interface GoogleDriveFileUploadedMessage {
    fileId: string
    folderId: string
    filePath: string
}

/**
 * Google Drive File Downloaded Message
 */
export interface GoogleDriveFileDownloadedMessage {
    outputPath: string
}

/**
 * Google Drive File Download Error Message
 */
export interface GoogleDriveFileDownloadErrorMessage {
    error: string
}

/**
 * Pyth Prices Fetched Message
 */
export interface PythPricesFetchedMessage {
    fetchedCount: number
    expectedCount: number
}

/**
 * Pyth Prices Fetch Failed Message
 */
export interface PythPricesFetchFailedMessage {
    error: string
    expectedCount: number
}

/**
 * Pyth Subscriptions Opened Message
 */
export interface PythSubscriptionsOpenedMessage {
    fetchedCount: number
    expectedCount: number
}

/**
 * Pyth Subscriptions Closed Message
 */
export interface PythSubscriptionsClosedMessage {
    streamName: string
    error: string
}

/**
 * Pyth Subscription Resolved Message
 */
export interface PythSubscriptionResolvedMessage {
    streamName: string
    symbols: Array<string>
}

/**
 * Pyth Subscription Error Message
 */
export interface PythSubscriptionErrorMessage {
    streamName: string
    error: string
    expectedCount: number
}

/**
 * Coin Market Cap Prices Fetched Message
 */
export interface CoinMarketCapPricesFetchedMessage {
    fetchedCount: number
    expectedCount: number
}

/**
 * Coin Market Cap Prices Fetch Failed Message
 */
export interface CoinMarketCapPricesFetchFailedMessage {
    error: string
    expectedCount: number
}

/**
 * Coingecko Prices Fetched Message
 */
export interface CoingeckoPricesFetchedMessage {
    fetchedCount: number
    expectedCount: number
}

/**
 * Coingecko Prices Fetch Failed Message
 */
export interface CoingeckoPricesFetchFailedMessage {
    error: string
    expectedCount: number
}