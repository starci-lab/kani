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
 * Open Position Job Enqueued Message
 */
export interface OpenPositionJobEnqueuedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    bullmqJobId?: string
}

/**
 * Open Position Job Enqueue Failed Message
 */
export interface OpenPositionJobEnqueueFailedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    error: string
}

/**
 * Open Position Job Requeued Message
 */
export interface OpenPositionJobRequeuedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    bullmqJobId?: string
}

/**
 * Open Position Job Requeue Failed Message
 */
export interface OpenPositionJobRequeueFailedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    error: string
}

/**
 * Open Position Skipped - Dynamic Liquidity Pool Info Not Ready Message
 */
export interface OpenPositionSkippedDynamicLiquidityPoolInfoNotReadyMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Skipped - Price Not Ready Message
 */
export interface OpenPositionSkippedPriceNotReadyMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    tokenId: TokenId
}

/**
 * Close Position Job Enqueued Message
 */
export interface ClosePositionJobEnqueuedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    bullmqJobId?: string
}

/**
 * Close Position Job Enqueue Failed Message
 */
export interface ClosePositionJobEnqueueFailedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Close Position Job Requeued Message
 */
export interface ClosePositionJobRequeuedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
    bullmqJobId?: string
}

/**
 * Close Position Job Requeue Failed Message
 */
export interface ClosePositionJobRequeueFailedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
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
 * Withdraw Job Enqueue Failed Message
 */
export interface WithdrawJobEnqueueFailedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Withdraw Job Scheduled Message
 */
export interface WithdrawJobScheduledMessage {
    botId: string
    tokenInputs: Array<{ id: string; amount: string }>
    toUsdc: boolean
}

/**
 * Withdraw Job Enqueued Message
 */
export interface WithdrawJobEnqueuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Withdraw Job Requeued Message
 */
export interface WithdrawJobRequeuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Withdraw Job Requeue Failed Message
 */
export interface WithdrawJobRequeueFailedMessage {
    botId: string
    jobId: string
    error: string
}

/**
 * Reconcile Balance Job Completed Message
 */
export interface ReconcileBalanceJobCompletedMessage {
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
 * Withdraw Job Completed Message
 */
export interface WithdrawJobCompletedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Withdraw Job Started Message
 */
export interface WithdrawJobStartedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Reconcile Balance Job Failed Unrecoverable Message
 */
export interface ReconcileBalanceJobFailedUnrecoverableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Reconcile Balance Job Failed Fatal Message
 */
export interface ReconcileBalanceJobFailedFatalMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Reconcile Balance Job Failed Permanent Failure Message
 */
export interface ReconcileBalanceJobFailedPermanentFailureMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Reconcile Balance Job Failed Retryable Message
 */
export interface ReconcileBalanceJobFailedRetryableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    attemptsMade: number
}

/**
 * Withdraw Job Failed Unrecoverable Message
 */
export interface WithdrawJobFailedUnrecoverableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Withdraw Job Failed Fatal Message
 */
export interface WithdrawJobFailedFatalMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Withdraw Job Failed Permanent Failure Message
 */
export interface WithdrawJobFailedPermanentFailureMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Withdraw Job Failed Retryable Message
 */
export interface WithdrawJobFailedRetryableMessage {
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
 * Reconcile Balance Prepared Message
 */
export interface ReconcileBalancePreparedMessage {
    botId: string
    txHashes: Array<string>
}

/**
 * Withdraw Prepared Message
 */
export interface WithdrawPreparedMessage {
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
 * Reconcile Balance Job Enqueued Message
 */
export interface ReconcileBalanceJobEnqueuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Reconcile Balance Job Enqueue Failed Message
 */
export interface ReconcileBalanceJobEnqueueFailedMessage {
    botId: string
    jobId: string
    error: string
}

/**
 * Reconcile Balance Job Requeued Message
 */
export interface ReconcileBalanceJobRequeuedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
}

/**
 * Reconcile Balance Job Requeue Failed Message
 */
export interface ReconcileBalanceJobRequeueFailedMessage {
    botId: string
    jobId: string
    error: string
}

/**
 * Balance amounts (target / quote / gas) used in reconcile-balance and related logs.
 */
export interface BalanceAmounts {
    targetBalanceAmount: string
    quoteBalanceAmount: string
    gasBalanceAmount: string
}

/**
 * Reconcile Balance Job Already Prepared Message
 */
export interface ReconcileBalanceJobAlreadyPreparedMessage {
    botId: string
    jobId: string
    ageMs: number
    quoteRatioResult?: object
    balanceAmounts: BalanceAmounts
    txHashes?: Array<string>
}

/**
 * Reconcile Balance Job Already Executed Message
 */
export interface ReconcileBalanceJobAlreadyExecutedMessage {
    botId: string
    jobId: string
    ageMs: number
}

/**
 * Reconcile Balance Job Already Confirmed Message
 */
export interface ReconcileBalanceJobAlreadyConfirmedMessage {
    botId: string
    jobId: string
    ageMs: number
}

/**
 * Reconcile Balance Job Confirmed Message
 */
export interface ReconcileBalanceJobConfirmedMessage {
    botId: string
    jobId: string
}

/**
 * Withdraw Requeue Failed Message
 */
export interface WithdrawRequeueFailedMessage {
    error: string
}

/**
 * Withdraw Job Already Prepared Message
 */
export interface WithdrawJobAlreadyPreparedMessage {
    botId: string
    jobId: string
    ageMs: number
    txHashes: Array<string>
}

/**
 * Withdraw Job Already Executed Message
 */
export interface WithdrawJobAlreadyExecutedMessage {
    botId: string
    jobId: string
    ageMs: number
}

/**
 * Withdraw Job Already Confirmed Message
 */
export interface WithdrawJobAlreadyConfirmedMessage {
    botId: string
    jobId: string
    ageMs: number
}

/**
 * Withdraw Job Prepared Message
 */
export interface WithdrawJobPreparedMessage {
    botId: string
    jobId: string
    txHashes: Array<string>
}

/**
 * Withdraw Job Confirmed Message
 */
export interface WithdrawJobConfirmedMessage {
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
    txHashes: Array<string>
    ageMs: number
}

/**
 * Open Position Job Already Executed Message
 */
export interface OpenPositionJobAlreadyExecutedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

/**
 * Open Position Job Already Confirmed Message
 */
export interface OpenPositionJobAlreadyConfirmedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

/**
 * Close Position Job Prepared Message
 */
export interface ClosePositionJobPreparedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    txHashes: Array<string>
}

/**
 * Close Position Job Already Prepared Message
 */
export interface ClosePositionJobAlreadyPreparedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    txHashes: Array<string>
    ageMs: number
}

/**
 * Close Position Job Already Executed Message
 */
export interface ClosePositionJobAlreadyExecutedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

/**
 * Close Position Job Already Confirmed Message
 */
export interface ClosePositionJobAlreadyConfirmedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

/**
 * Close Position Job Confirmed Message
 */
export interface ClosePositionJobConfirmedMessage {
    botId: string
    jobId: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Job Failed Unrecoverable Message
 */
export interface ClosePositionJobFailedUnrecoverableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Job Failed Fatal Message
 */
export interface ClosePositionJobFailedFatalMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Close Position Job Failed Permanent Failure Message
 */
export interface ClosePositionJobFailedPermanentFailureMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Job Failed Retryable Message
 */
export interface ClosePositionJobFailedRetryableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    attemptsMade: number
    liquidityPoolId: LiquidityPoolId
}

/**
 * Close Position Job Completed Message
 */
export interface ClosePositionJobCompletedMessage {
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
 * Open Position Job Failed Unrecoverable Message
 */
export interface OpenPositionJobFailedUnrecoverableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Job Failed Fatal Message
 */
export interface OpenPositionJobFailedFatalMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Open Position Job Failed Permanent Failure Message
 */
export interface OpenPositionJobFailedPermanentFailureMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Job Failed Retryable Message
 */
export interface OpenPositionJobFailedRetryableMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
    attemptsMade: number
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Job Completed Message
 */
export interface OpenPositionJobCompletedMessage {
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
 * Open Position Job Started Message
 */
export interface OpenPositionJobStartedMessage {
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
 * Open Position Job Prepared Message
 */
export interface OpenPositionJobPreparedMessage {
    botId: string
    jobId: string
    txHashes: Array<string>
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
 * Withdraw Bootstrapping Failed Message
 */
export interface WithdrawBootstrappingFailedMessage {
    botId: string
    jobId: string
    bullmqJobId?: string
    error: string
}

/**
 * Withdraw Job Already Enqueued Message
 */
export interface WithdrawJobAlreadyEnqueuedMessage {
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
    txHashes: Array<string>
    liquidityPoolId: LiquidityPoolId
}

/**
 * Open Position Job Confirmed Message
 */
export interface OpenPositionJobConfirmedMessage {
    botId: string
    liquidityPoolId: LiquidityPoolId
    jobId: string
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
 * Eval Snapshot Message
 */
export interface EvalSnapshotMessage {
    botId: string
    totalBalanceAmountInUsd: string
    minRequiredAmountInUsd: string
    eligible: boolean
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
 * Migration User Totp Completed Message
 */
export interface MigrationUserTotpCompletedMessage {
    updatedCount: number
    skippedCount?: number
}

/**
 * Migration User Totp Failed Message
 */
export interface MigrationUserTotpFailedMessage {
    error: string
}

/**
 * Migration Bot Executor Completed Message
 */
export interface MigrationBotExecutorCompletedMessage {
    updatedCount: number
}

/**
 * Migration Bot Executor Failed Message
 */
export interface MigrationBotExecutorFailedMessage {
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

/**
 * Lock Authority Notify Expired Locks Failed Message
 */
export interface LockAuthorityNotifyExpiredLocksFailedMessage {
    error: string
}

/**
 * Lock Authority Acquire Failed Message
 */
export interface LockAuthorityAcquireFailedMessage {
    botId: string
    key: string
    lockSchedulerKey: string
    error: string
}

/**
 * Lock Authority Release Failed Message
 */
export interface LockAuthorityReleaseFailedMessage {
    botId: string
    key: string
    lockSchedulerKey: string
    error: string   
}

/**
 * Lock Authority Send Heartbeat Failed Message
 */
export interface LockAuthoritySendHeartbeatFailedMessage {
    botId: string
    key: string
    lockSchedulerKey: string
    error: string
}

/**
 * Withdraw Transaction Executed Message
 */
export interface WithdrawTransactionExecutedMessage {
    botId: string
    txHash: string
}

/**
 * Withdraw Transaction Stimulated Message
 */
export interface WithdrawTransactionStimulatedMessage {
    botId: string
    txHash: string
}

/**
 * Reconcile Balance Transaction Executed Message
 */
export interface ReconcileBalanceTransactionExecutedMessage {
    botId: string
    txHash: string
}

/**
 * Reconcile Balance Transaction Stimulated Message
 */
export interface ReconcileBalanceTransactionStimulatedMessage {
    botId: string
    txHash: string
}

/**
 * Reconcile Balance Job Prepared Message
 */
export interface ReconcileBalanceJobPreparedMessage {
    botId: string
    jobId: string
    txHashes?: Array<string>
    quoteRatioResult?: object
    balanceAmounts: BalanceAmounts
}

/**
 * Withdraw Transaction Prepared Message
 */
export interface WithdrawTransactionPreparedMessage {
    botId: string
    txHashes: Array<string>
}

/**
 * Withdraw Transaction Found Message
 */
export interface WithdrawTransactionFoundMessage {
    botId: string
    txHash: string
}


/**
 * Reconcile Balance Transaction Found Message
 */
export interface ReconcileBalanceTransactionFoundMessage {
    botId: string
    txHash: string
}

/**
 * Reconcile Balance Lock Authority Released Message
 */
export interface ReconcileBalanceLockAuthorityReleasedMessage {
    botId: string
}

/**
 * Open Position Lock Authority Released Message
 */
export interface OpenPositionLockAuthorityReleasedMessage {
    botId: string
}

/**
 * Close Position Lock Authority Released Message
 */
export interface ClosePositionLockAuthorityReleasedMessage {
    botId: string
}

/**
 * Withdraw Lock Authority Released Message
 */
export interface WithdrawLockAuthorityReleasedMessage {
    botId: string
}