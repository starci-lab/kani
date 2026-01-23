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

/**
 * Eject RPC Fatal Error Message
 */
export interface EjectRpcFatalErrorMessage {
    rpcId: string
}

/**
 * Eject RPC Retryable Error Message
 */
export interface EjectRpcRetryableErrorMessage {
    rpcId: string
}

/**
 * Eject RPC Ignorable Error Message
 */
export interface EjectRpcIgnorableErrorMessage {
    rpcId: string
}

/**
 * Pyth Rest Prices Fetched Message
 */
export interface PythRestPricesFetchedMessage {
    fetchedCount: number
    expectedCount: number
}

/**
 * Pyth Rest Prices Fetch Failed Message
 */
export interface PythRestPricesFetchFailedMessage {
    error: string
    expectedCount: number
}

/**
 * Cleanup Deployments Error Message
 */
export interface CleanupDeploymentsErrorMessage {
    error: string
}

/**
 * Cleanup Services Error Message
 */
export interface CleanupServicesErrorMessage {
    error: string
}

/**
 * Deployment Created Message
 */
export interface DeploymentCreatedMessage {
    executorId: string
}

/**
 * Deployment Deleted Message
 */
export interface DeploymentDeletedMessage {
    executorId: string
}

/**
 * Deployment Patched Message
 */
export interface DeploymentPatchedMessage {
    executorId: string
}

/**
 * Deployment Patch Failed Message
 */
export interface DeploymentPatchFailedMessage {
    executorId: string
    error: string
}

/**
 * Deployment Create Failed Message
 */
export interface DeploymentCreateFailedMessage {
    executorId: string
    error: string
}

/**
 * Deployment Delete Failed Message
 */
export interface DeploymentDeleteFailedMessage {
    executorId: string
    error: string
}

/**
 * Service Created Message
 */
export interface ServiceCreatedMessage {
    executorId: string
}

/**
 * Service Deleted Message
 */
export interface ServiceDeletedMessage {
    executorId: string
}

/**
 * Service Create Failed Message
 */
export interface ServiceCreateFailedMessage {
    executorId: string
    error: string
}

/**
 * Service Delete Failed Message
 */
export interface ServiceDeleteFailedMessage {
    executorId: string
    error: string
}

/**
 * Coordinator Executors Created Message
 */
export interface CoordinatorExecutorsCreatedMessage {
    ids: Array<string>
}

/**
 * Coordinator Executors Deleted Message
 */
export interface CoordinatorExecutorsDeletedMessage {
    ids: Array<string>
}

/**
 * Coordinator Executors Updated Message
 */
export interface CoordinatorExecutorsUpdatedMessage {
    ids: Array<string>
}

/**
 * Coordinator Primary Mongo Db Change Stream Error Message
 */
export interface CoordinatorPrimaryMongoDbChangeStreamErrorMessage {
    streamName: string
    error: string
}

/**
 * Coordinator Primary Mongo Db Change Stream Close Message
 */
export interface CoordinatorPrimaryMongoDbChangeStreamCloseMessage {
    streamName: string
}

/**
 * Coordinator Primary Mongo Db Change Stream Started Message
 */
export interface CoordinatorPrimaryMongoDbChangeStreamStartedMessage {
    streamName: string
}

/**
 * Coordinator Primary Mongo Db Change Stream Executor Created Message
 */
export interface CoordinatorPrimaryMongoDbChangeStreamExecutorCreatedMessage {
    id: string
}

/**
 * Coordinator Primary Mongo Db Change Stream Executor Deleted Message
 */
export interface CoordinatorPrimaryMongoDbChangeStreamExecutorDeletedMessage {
    id: string
}

/**
 * Coordinator Primary Mongo Db Change Stream Executor Updated Message
 */
export interface CoordinatorPrimaryMongoDbChangeStreamExecutorUpdatedMessage {
    id: string
}

/**
 * Executor Bots Updated Message
 */
export interface ExecutorBotsUpdatedMessage {
    ids: Array<string>
}

/**
 * Executor Bots Created Message
 */
export interface ExecutorBotsCreatedMessage {
    ids: Array<string>
}

/**
 * Executor Bots Deleted Message
 */
export interface ExecutorBotsDeletedMessage {
    ids: Array<string>
}

/**
 * Executor Mongo Db Change Stream Error Message
 */
export interface ExecutorMongoDbChangeStreamErrorMessage {
    streamName: string
    error: string
}

/**
 * Executor Mongo Db Change Stream Close Message
 */
export interface ExecutorMongoDbChangeStreamCloseMessage {
    streamName: string
}

/**
 * Executor Mongo Db Change Stream Started Message
 */
export interface ExecutorMongoDbChangeStreamStartedMessage {
    streamName: string
}

/**
 * Executor Mongo Db Change Stream Bot Updated Message 
 */
export interface ExecutorMongoDbChangeStreamBotUpdatedMessage {
    id: string
}

/**
 * Executor Runtime Initialization Failed Message
 */
export interface ExecutorRuntimeInitializationFailedMessage {
    executorId: string
    error: string
}

/**
 * Coordinator Runtime Initialization Failed Message
 */
export interface CoordinatorRuntimeInitializationFailedMessage {
    coordinatorId: string
    error: string
}

/**
 * Executor Not Found Message
 */
export interface ExecutorNotFoundMessage {
    id: string
}

/**
 * Reconcile Balance Enqueue Failed Message
 */
export interface ReconcileBalanceEnqueueFailedMessage {
    botId: string
    error: string
    bullmqJobId?: string
}

/**
 * Reconcile Balance Enqueued Message
 */
export interface ReconcileBalanceEnqueuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Reconcile Balance Processing Completed Message
 */
export interface ReconcileBalanceProcessingCompletedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Reconcile Balance Processing Started Message
 */
export interface ReconcileBalanceProcessingStartedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Reconcile Balance Processing Failed Unrecoverable Message
 */
export interface ReconcileBalanceProcessingFailedUnrecoverableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Reconcile Balance Processing Failed Permanent Failure Message
 */
export interface ReconcileBalanceProcessingFailedPermanentFailureMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Reconcile Balance Processing Failed Retryable Message
 */
export interface ReconcileBalanceProcessingFailedRetryableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    attemptsMade: number
}

/**
 * Price Diagnostic Failed Message
 */
export interface PriceDiagnosticFailedMessage {
    tokenId: TokenId
    error: string
}

/**
 * Price Diagnostic Success Message
 */
export interface PriceDiagnosticSuccessMessage {
    tokenId: TokenId
}

/**
 * Price Diagnostic Failed Not Found Message
 */
export interface PriceDiagnosticFailedNotFoundMessage {
    tokenId: TokenId
}

/**
 * Price Diagnostic Failed Stale Message
 */
export interface PriceDiagnosticFailedStaleMessage {
    tokenId: TokenId
    ageMs: number
}

/**
 * Price Diagnostic Failed Message
 */
export interface PriceDiagnosticFailedMessage {
    tokenId: TokenId
    error: string
}

/**
 * Dynamic Liquidity Pool Info Diagnostic Failed Not Found Message
 */
export interface DynamicLiquidityPoolInfoDiagnosticFailedNotFoundMessage {
    liquidityPoolId: LiquidityPoolId
}

/**
 * Dynamic Liquidity Pool Info Diagnostic Success Message
 */
export interface DynamicLiquidityPoolInfoDiagnosticSuccessMessage {
    liquidityPoolId: LiquidityPoolId
}

/**
 * Dynamic Liquidity Pool Info Diagnostic Failed Stale Message
 */
export interface DynamicLiquidityPoolInfoDiagnosticFailedStaleMessage {
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

/**
 * Dynamic Liquidity Pool Info Diagnostic Failed Message
 */
export interface DynamicLiquidityPoolInfoDiagnosticFailedMessage {
    liquidityPoolId: LiquidityPoolId
    error: string
}


/**
 * Swap Transaction Stimulated Message
 */
export interface SwapTransactionStimulatedMessage {
    botId: string
    txHash: string
}

/**
 * Swap Transaction Prepared Message
 */
export interface SwapTransactionPreparedMessage {
    botId: string
    txHashes: Array<string>
}