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
    fileId?: string
    folderId?: string
    filePath?: string
    archiveName?: string
}

/**
 * Google Drive File Downloaded Message
 */
export interface GoogleDriveFileDownloadedMessage {
    outputPath?: string
    fileId?: string
    archiveName?: string
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
    jobId: string
    bullmqJobId?: string
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
    jobId: string
    bullmqJobId?: string
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
    durationMs: number
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
    price: number
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

/**
 * Reconcile Balance Requeue Failed Message
 */
export interface ReconcileBalanceRequeueFailedMessage {
    error: string
}

/**
 * Reconcile Balance Job Already Prepared Message
 */
export interface ReconcileBalanceJobAlreadyPreparedMessage {
    botId: string
    jobId: string
}

/**
 * Reconcile Balance Job Already Executed Message
 */
export interface ReconcileBalanceJobAlreadyExecutedMessage {
    botId: string
    jobId: string
}

/**
 * Reconcile Balance Job Already Confirmed Message
 */
export interface ReconcileBalanceJobAlreadyConfirmedMessage {
    botId: string
    jobId: string
}

/**
 * Open Position Job Already Prepared Message
 */
export interface OpenPositionJobAlreadyPreparedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Job Already Executed Message
 */
export interface OpenPositionJobAlreadyExecutedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Job Already Confirmed Message
 */
export interface OpenPositionJobAlreadyConfirmedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Job Already Prepared Message
 */
export interface ClosePositionJobAlreadyPreparedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Job Already Executed Message
 */
export interface ClosePositionJobAlreadyExecutedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Job Already Confirmed Message
 */
export interface ClosePositionJobAlreadyConfirmedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Processing Failed Unrecoverable Message
 */
export interface ClosePositionProcessingFailedUnrecoverableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Processing Failed Permanent Failure Message
 */
export interface ClosePositionProcessingFailedPermanentFailureMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Processing Failed Retryable Message
 */
export interface ClosePositionProcessingFailedRetryableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    attemptsMade: number
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Processing Completed Message
 */
export interface ClosePositionProcessingCompletedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Requeue Failed Message
 */
export interface ClosePositionRequeueFailedMessage {
    error: string
}

/**
 * Open Position Processing Failed Unrecoverable Message
 */
export interface OpenPositionProcessingFailedUnrecoverableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Processing Failed Permanent Failure Message
 */
export interface OpenPositionProcessingFailedPermanentFailureMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Processing Failed Retryable Message
 */
export interface OpenPositionProcessingFailedRetryableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    attemptsMade: number
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Processing Completed Message
 */
export interface OpenPositionProcessingCompletedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Requeue Failed Message
 */
export interface OpenPositionRequeueFailedMessage {
    error: string
}

/**
 * Open Position Processing Started Message
 */
export interface OpenPositionProcessingStartedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Diagnostics Ready Message
 */
export interface DiagnosticsReadyMessage {
    bootstrapTimeMs: number
}

/**
 * Open Position Transaction Stimulated Message
 */
export interface OpenPositionTransactionStimulatedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Transaction Stimulated Message
 */
export interface ClosePositionTransactionStimulatedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Transaction Prepared Message
 */
export interface OpenPositionTransactionPreparedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Transaction Found Message
 */
export interface ClosePositionTransactionFoundMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Transaction Found Message
 */
export interface OpenPositionTransactionFoundMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Swap Transaction Found Message
 */
export interface SwapTransactionFoundMessage {
    botId: string
    txHash: string
}

/**
 * Open Position Bootstrapping Failed Message
 */
export interface OpenPositionBootstrappingFailedMessage {
    botId: string
    error: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Close Position Bootstrapping Failed Message
 */
export interface ClosePositionBootstrappingFailedMessage {
    botId: string
    error: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Reconcile Balance Bootstrapping Failed Message
 */
export interface ReconcileBalanceBootstrappingFailedMessage {
    botId: string
    error: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Open Position Job Already Enqueued Message
 */
export interface OpenPositionJobAlreadyEnqueuedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    bullmqJobId?: string
}

/**
 * Close Position Job Already Enqueued Message
 */
export interface ClosePositionJobAlreadyEnqueuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Reconcile Balance Job Already Enqueued Message
 */
export interface ReconcileBalanceJobAlreadyEnqueuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Cannot Settle Position Message
 */
export interface CannotSettlePositionMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    strategyResults: unknown
}

/**
 * Close Position Transaction Prepared Message
 */
export interface ClosePositionTransactionPreparedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Transaction Confirmed Message
 */
export interface OpenPositionTransactionConfirmedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Clmm Liquidity Pools Synced Diagnostic Message
 */
export interface ClmmLiquidityPoolsSyncedDiagnosticMessage {
    id: string
}

/**
 * Dlmm Liquidity Pools Synced Diagnostic Message
 */
export interface DlmmLiquidityPoolsSyncedDiagnosticMessage {
    id: string
}

/**
 * Liquidity Pools Became Ready Message
 */
export interface LiquidityPoolsBecameReadyMessage {
    syncAges: Array<LiquidityPoolSyncAge>
}

/**
 * Liquidity Pools Became Not Ready Message
 */
export interface LiquidityPoolsBecameNotReadyMessage {
    syncAges: Array<LiquidityPoolSyncAge>
}

/**
 * Liquidity Pool Sync Age Message
 */
export interface LiquidityPoolSyncAge {
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

/**
 * Socket Io Client Connected Message
 */
export interface SocketIoClientConnectedMessage {
    clientId: string
    userId: string
}

/**
 * Socket Io Client Disconnected Message
 */
export interface SocketIoClientDisconnectedMessage {
    clientId: string
    userId: string
}

/**
 * Mongo Dump Completed Message
 */
export interface MongoDumpCompletedMessage {
    dumpDirName: string
}

/**
 * SevenZ Compression Completed Message
 */
export interface SevenZCompressionCompletedMessage {
    archiveName: string
}

/**
 * Backup Completed Message
 */
export interface BackupCompletedMessage {
    archiveName: string
}

/**
 * Backup Failed Message
 */
export interface BackupFailedMessage {
    error: string
}

/**
 * SevenZ Extraction Completed Message
 */
export interface SevenZExtractionCompletedMessage {
    archiveName: string
}

/**
 * MongoDB Restore Completed Message
 */
export interface MongoDBRestoreCompletedMessage {
    dbName: string
    fileId: string
}

/**
 * Restore Completed Message
 */
export interface RestoreCompletedMessage {
    archiveName: string
    fileId: string
}

/**
 * Restore Failed Message
 */
export interface RestoreFailedMessage {
    error: string
}
/**
 * Seed Failed Message
 */
export interface SeedFailedMessage {
    error: string
}

/**
 * Migration Open Snapshots Updated Message
 */
export interface MigrationOpenSnapshotsUpdatedMessage {
    matched: number
    modified: number
}

/**
 * Migration Close Snapshots Updated Message
 */
export interface MigrationCloseSnapshotsUpdatedMessage {
    matched: number
    modified: number
}

/**
 * Migration Completed Message
 */
export interface MigrationCompletedMessage {
    openSnapshots: {
        matched: number
        modified: number
    }
    closeSnapshots: {
        matched: number
        modified: number
    }
}

/**
 * Migration Failed Message
 */
export interface MigrationFailedMessage {
    error: string
    stack?: string
}

/**
 * Key Generation Failed Message
 */
export interface KeyGenerationFailedMessage {
    error: string
}

/**
 * Key Decryption Check Failed Message
 */
export interface KeyDecryptionCheckFailedMessage {
    error: string
}
/**
 * Key Written Success Message
 */
export interface KeyWrittenSuccessMessage {
    keyName: string
}

/**
 * Command Error Message
 */
export interface CommandErrorMessage {
    message: string
}

/**
 * Migration Avatars Completed Message
 */
export interface MigrationAvatarsCompletedMessage {
    updatedCount: number
}

/**
 * Migration Avatars Failed Message
 */
export interface MigrationAvatarsFailedMessage {
    error: string
}

/**
 * Error Getting Cache Message
 */
export interface ErrorGettingCacheMessage {
    cacheKey: string
    error: string
    cacheType: string
}

/**
 * Error Setting Cache Message
 */
export interface ErrorSettingCacheMessage {
    cacheKey: string
    error: string
    cacheType: string
}

export interface ErrorDeletingCacheMessage {
    cacheKey: string
    error: string
    cacheType: string
}

/**
 * Cache Debug Ok Redis Message
 */
export interface CacheDebugOkRedisMessage {
    randomString: string
}

/**
 * Cache Debug Ok Memory Message
 */
export interface CacheDebugOkMemoryMessage {
    randomString: string
}