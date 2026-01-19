import {
    LiquidityPoolId, 
    TokenId
} from "@modules/databases"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    ChainId 
} from "@modules/typedefs"

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
    streamName: string
    symbols: Array<string>
}

/**
 * Pyth Subscriptions Closed Message
 */
export interface PythSubscriptionsClosedMessage {
    streamName: string
    error: string
    symbols: Array<string>
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
    symbols: Array<string>
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

/**
 * No Available RPCs Message
 */
export interface NoAvailableRpcMessage {
    chainId: ChainId
    accessType: RpcAccessType
}

/**
 * Open Position Enqueued Message
 */
export interface OpenPositionEnqueuedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Enqueue Failed Message
 */
export interface OpenPositionEnqueueFailedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    error: string
}

/**
 * Close Position Enqueued Message
 */
export interface ClosePositionEnqueuedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Enqueue Failed Message
 */
export interface ClosePositionEnqueueFailedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    error: string
}

/**
 * Error Decrypting JWT Secret Key Message
 */
export interface ErrorDecryptingJwtSecretKeyMessage {
    error: string
}

/**
 * Error Decrypting AES Key Message
 */
export interface ErrorDecryptingAesKeyMessage {
    error: string
}

/**
 * Websocket Subscription Opened Message
 */
export interface WebsocketSubscriptionOpenedMessage {
    streamName: string
    symbols: Array<string>
}

/**
 * Websocket Subscription Closed Message
 */
export interface WebsocketSubscriptionClosedMessage {
    streamName: string
    symbols: Array<string>
}

/**
 * Websocket Subscription Error Message
 */
export interface WebsocketSubscriptionErrorMessage {
    streamName: string
    error: string
    symbols: Array<string>
}

/**
 * Websocket Subscription Resolved Message
 */
export interface WebsocketSubscriptionResolvedMessage {
    streamName: string
    symbols: Array<string>
}