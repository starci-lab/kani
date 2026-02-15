import {
    WinstonLog,
} from "./enums"
import {
    ClmmLiquidityPoolsSyncedMessage,
    DlmmLiquidityPoolsSyncedMessage,
    LiquidityPoolsSyncedMarkedAsReadyMessage,
    NotSyncedProcessClosePositionMessage,
    NotSyncedProcessOpenPositionMessage,
    OpenPositionSkippedActiveJobFoundInQueueMessage,
    OpenPositionSkippedBalanceSnapshotTooOldMessage,
    OpenPositionSkippedBotAlreadyHasActiveJobMessage,
    OpenPositionSkippedBotAlreadyHasActivePositionMessage,
    OpenPositionSkippedBotNotRunningMessage,
    OpenPositionSkippedNoBalanceSnapshotMessage,
    OpenPositionSkippedNotEligibleMessage,
    RotationBotAssignmentsMessage,
    TransactionStimulatedMessage,
    TransactionExecutedMessage,
    WinstonLevel,
    ActionJobCompletedMessage,
    ActionJobFailedMessage,
    ActionJobContextLoadFailedMessage,
    MetricInitializedMessage,
    ClosePositionTransactionExecutedMessage,
    ClosePositionTransactionFailedMessage,
    CoingeckoPricesFetchedMessage,
    CoingeckoPricesFetchFailedMessage,
    CoinMarketCapPricesFetchedMessage,
    CoinMarketCapPricesFetchFailedMessage,
    GoogleDriveFileDownloadedMessage,
    GoogleDriveFileDownloadErrorMessage,
    GoogleDriveFileUploadedMessage,
    LiquidityPoolFetchedErrorMessage,
    LiquidityPoolWsErrorMessage,
    NoAvailableRpcMessage,
    OpenPositionJobEnqueueFailedMessage,
    OpenPositionJobEnqueuedMessage,
    OpenPositionJobRequeuedMessage,
    OpenPositionJobRequeueFailedMessage,
    OpenPositionSkippedDynamicLiquidityPoolInfoNotReadyMessage,
    OpenPositionSkippedPriceNotReadyMessage,
    ClosePositionJobEnqueuedMessage,
    ClosePositionJobEnqueueFailedMessage,
    ClosePositionJobRequeuedMessage,
    ClosePositionJobRequeueFailedMessage,
    OpenPositionTransactionExecutedMessage,
    OpenPositionTransactionFailedMessage,
    PythPricesFetchedMessage,
    PythPricesFetchFailedMessage,
    PythSubscriptionErrorMessage,
    PythSubscriptionResolvedMessage,
    PythSubscriptionsClosedMessage,
    PythSubscriptionsOpenedMessage,
    SwapTransactionExecutedMessage,
    SwapTransactionFailedMessage,
    ErrorDecryptingJwtSecretKeyMessage,
    ErrorDecryptingAesKeyMessage,
    WebsocketSubscriptionResolvedMessage,
    WebsocketSubscriptionErrorMessage,
    WebsocketSubscriptionClosedMessage,
    WebsocketSubscriptionOpenedMessage,
    EjectRpcRetryableErrorMessage,
    EjectRpcFatalErrorMessage,
    EjectRpcIgnorableErrorMessage,
    PythRestPricesFetchedMessage,
    PythRestPricesFetchFailedMessage,
    CleanupDeploymentsErrorMessage,
    CleanupServicesErrorMessage,
    DeploymentCreatedMessage,
    DeploymentDeletedMessage,
    DeploymentPatchFailedMessage,
    DeploymentPatchedMessage,
    DeploymentCreateFailedMessage,
    ServiceCreatedMessage,
    DeploymentDeleteFailedMessage,
    ServiceDeletedMessage,
    ServiceCreateFailedMessage,
    ServiceDeleteFailedMessage,
    CoordinatorExecutorsDeletedMessage,
    CoordinatorExecutorsUpdatedMessage,
    CoordinatorExecutorsCreatedMessage,
    CoordinatorPrimaryMongoDbChangeStreamStartedMessage,
    CoordinatorPrimaryMongoDbChangeStreamCloseMessage,
    CoordinatorPrimaryMongoDbChangeStreamErrorMessage,
    CoordinatorPrimaryMongoDbChangeStreamExecutorCreatedMessage,
    CoordinatorPrimaryMongoDbChangeStreamExecutorDeletedMessage,
    CoordinatorPrimaryMongoDbChangeStreamExecutorUpdatedMessage,
    ExecutorBotsDeletedMessage,
    ExecutorBotsCreatedMessage,
    ExecutorBotsUpdatedMessage,
    ExecutorMongoDbChangeStreamErrorMessage,
    ExecutorMongoDbChangeStreamCloseMessage,
    ExecutorMongoDbChangeStreamStartedMessage,
    ExecutorMongoDbChangeStreamBotUpdatedMessage,
    ExecutorRuntimeInitializationFailedMessage,
    CoordinatorRuntimeInitializationFailedMessage,
    ExecutorNotFoundMessage,
    ReconcileBalanceProcessingStartedMessage,
    ReconcileBalanceJobCompletedMessage,
    WithdrawJobEnqueueFailedMessage,
    WithdrawJobScheduledMessage,
    WithdrawJobEnqueuedMessage,
    WithdrawJobRequeuedMessage,
    WithdrawJobRequeueFailedMessage,
    WithdrawJobStartedMessage,
    WithdrawJobCompletedMessage,
    PriceDiagnosticFailedMessage,
    PriceDiagnosticSuccessMessage,
    PriceDiagnosticFailedNotFoundMessage,
    DynamicLiquidityPoolInfoDiagnosticFailedMessage,
    DynamicLiquidityPoolInfoDiagnosticFailedNotFoundMessage,
    DynamicLiquidityPoolInfoDiagnosticFailedStaleMessage,
    DynamicLiquidityPoolInfoDiagnosticSuccessMessage,
    PriceDiagnosticFailedStaleMessage,
    SwapTransactionStimulatedMessage,
    SwapTransactionPreparedMessage,
    ReconcileBalancePreparedMessage,
    WithdrawPreparedMessage,
    ReconcileBalanceRequeueFailedMessage,
    ReconcileBalanceJobAlreadyPreparedMessage,
    ReconcileBalanceJobAlreadyConfirmedMessage,
    ReconcileBalanceJobConfirmedMessage,
    ReconcileBalanceJobAlreadyExecutedMessage,
    WithdrawRequeueFailedMessage,
    WithdrawJobPreparedMessage,
    WithdrawJobConfirmedMessage,
    WithdrawJobAlreadyPreparedMessage,
    WithdrawJobAlreadyConfirmedMessage,
    WithdrawJobAlreadyExecutedMessage,
    OpenPositionJobAlreadyExecutedMessage,
    ClosePositionJobPreparedMessage,
    ClosePositionJobAlreadyPreparedMessage,
    OpenPositionJobAlreadyConfirmedMessage,
    ClosePositionJobAlreadyExecutedMessage,
    ClosePositionJobAlreadyConfirmedMessage,
    ClosePositionJobConfirmedMessage,
    OpenPositionJobAlreadyPreparedMessage,
    ClosePositionJobCompletedMessage,
    ClosePositionRequeueFailedMessage,
    JobFailedMessage,
    OpenPositionJobCompletedMessage,
    OpenPositionRequeueFailedMessage,
    OpenPositionJobStartedMessage,
    DiagnosticsReadyMessage,
    ClosePositionTransactionStimulatedMessage,
    OpenPositionTransactionStimulatedMessage,
    OpenPositionJobPreparedMessage,
    ClosePositionTransactionFoundMessage,
    OpenPositionTransactionFoundMessage,
    SwapTransactionFoundMessage,
    ClosePositionBootstrappingFailedMessage,
    OpenPositionBootstrappingFailedMessage,
    ReconcileBalanceBootstrappingFailedMessage,
    WithdrawBootstrappingFailedMessage,
    OpenPositionJobAlreadyEnqueuedMessage,
    ReconcileBalanceJobAlreadyEnqueuedMessage,
    WithdrawJobAlreadyEnqueuedMessage,
    ClosePositionJobAlreadyEnqueuedMessage,
    CannotSettlePositionMessage,
    ClosePositionTransactionPreparedMessage,
    OpenPositionJobConfirmedMessage,
    DlmmLiquidityPoolsSyncedDiagnosticMessage,
    ClmmLiquidityPoolsSyncedDiagnosticMessage,
    LiquidityPoolsBecameNotReadyMessage,
    LiquidityPoolsBecameReadyMessage,
    SocketIoClientConnectedMessage,
    SocketIoClientDisconnectedMessage,
    MongoDumpCompletedMessage,
    SevenZCompressionCompletedMessage,
    BackupCompletedMessage,
    BackupFailedMessage,
    SevenZExtractionCompletedMessage,
    MongoDBRestoreCompletedMessage,
    RestoreCompletedMessage,
    RestoreFailedMessage,
    MigrationOpenSnapshotsUpdatedMessage,
    MigrationCloseSnapshotsUpdatedMessage,
    MigrationCompletedMessage,
    MigrationFailedMessage,
    MigrationAvatarsCompletedMessage,
    MigrationAvatarsFailedMessage,
    MigrationUserTotpCompletedMessage,
    MigrationUserTotpFailedMessage,
    MigrationBotExecutorCompletedMessage,
    MigrationBotExecutorFailedMessage,
    KeyGenerationFailedMessage,
    KeyDecryptionCheckFailedMessage,
    KeyWrittenSuccessMessage,
    CommandErrorMessage,
    EvalSnapshotMessage,
    ErrorGettingCacheMessage,
    ErrorSettingCacheMessage,
    ErrorDeletingCacheMessage,
    CacheDebugOkRedisMessage,
    CacheDebugOkMemoryMessage,
    LockAuthorityReleaseFailedMessage,
    LockAuthorityAcquiredMessage,
    LockAuthorityAcquireFailedMessage,
    LockAuthorityNotifyExpiredLocksFailedMessage,
    LockAuthoritySendHeartbeatFailedMessage,
    WithdrawTransactionExecutedMessage,
    WithdrawTransactionStimulatedMessage,
    ReconcileBalanceTransactionExecutedMessage,
    ReconcileBalanceTransactionStimulatedMessage,
    ReconcileBalanceJobPreparedMessage,
    WithdrawTransactionPreparedMessage,
    WithdrawTransactionFoundMessage,
    ReconcileBalanceTransactionFoundMessage,
    ReconcileBalanceJobEnqueueFailedMessage,
    ReconcileBalanceJobEnqueuedMessage,
    ReconcileBalanceJobRequeuedMessage,
    ReconcileBalanceJobRequeueFailedMessage,
    ReconcileBalanceLockAuthorityNotAcquiredMessage,
    ReconcileBalanceLockAuthorityReleasedMessage,
    ReconcileBalanceSkippedActiveJobFoundInQueueMessage,
    ReconcileBalanceSkippedBalanceSnapshotWithinCooldownMessage,
    ReconcileBalanceSkippedBotAlreadyHasActiveJobMessage,
    ReconcileBalanceSkippedBotAlreadyHasActivePositionMessage,
    ReconcileBalanceSkippedBotNotRunningMessage,
    OpenPositionLockAuthorityNotAcquiredMessage,
    OpenPositionLockAuthorityReleasedMessage,
    ClosePositionLockAuthorityNotAcquiredMessage,
    ClosePositionLockAuthorityReleasedMessage,
    ClosePositionSkippedActiveJobFoundInQueueMessage,
    ClosePositionSkippedBotAlreadyHasActiveJobMessage,
    ClosePositionSkippedBotHasNoActivePositionMessage,
    WithdrawLockAuthorityReleasedMessage,
    ConsulRegisterFailedMessage,
    ConsulRegisterSuccessfullyMessage,
    JobEnqueuedMessage,
    JobEnqueueFailedMessage,
    TransactionSignedMessage,
    ActionJobTaskConfirmedMessage,
    ActiveJobTaskPreparedMessage,
    ReconcileBalancePlanDeterminedMessage,
    JobSkippedFoundInQueueMessage,
    JobSkippedAuthorityNotAcquiredMessage,
    JobRequeuedMessage,
    JobRequeueFailedMessage,
    JobSkippedNotFoundInDatabaseMessage,
    JobSkippedContextLoadFailedMessage,
    JobSkippedBotAlreadyHasActivePositionMessage,
    JobSkippedBotNotHasActivePositionMessage,
    JobSkippedBotNotRunningMessage,
} from "./types"

/** Map of Winston log names to level, Loki flag, and message type. */
export const configMap = {
    // Transaction Stimulated
    [WinstonLog.TransactionStimulated]: {
        name: WinstonLog.TransactionStimulated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as TransactionStimulatedMessage,
    },
    // Transaction Executed
    [WinstonLog.TransactionExecuted]: {
        name: WinstonLog.TransactionExecuted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as TransactionExecutedMessage,
    },
    // Kafka Producer Ready
    [WinstonLog.KafkaProducerReady]: {
        name: WinstonLog.KafkaProducerReady,
        level: WinstonLevel.Info,
        loki: false,
        messageType: {  
        },
    },
    // Kafka Topics Created
    [WinstonLog.KafkaTopicsCreated]: {
        name: WinstonLog.KafkaTopicsCreated,
        level: WinstonLevel.Info,
        loki: false,
        messageType: {
        },
    },
    // Kafka Topics Deleted
    [WinstonLog.KafkaTopicsDeleted]: {
        name: WinstonLog.KafkaTopicsDeleted,
        level: WinstonLevel.Info,
        loki: false,
        messageType: {
        },
    },
    // Kafka Consumer Ready
    [WinstonLog.KafkaConsumerReady]: {
        name: WinstonLog.KafkaConsumerReady,
        level: WinstonLevel.Info,
        loki: false,
        messageType: {
        },
    },
    // Kafka Consumer Topics Subscribed
    [WinstonLog.KafkaConsumerTopicsSubscribed]: {
        name: WinstonLog.KafkaConsumerTopicsSubscribed,
        level: WinstonLevel.Info,
        loki: false,
        messageType: {
        },
    },
    // Kafka Consumer Opened
    [WinstonLog.KafkaConsumerOpened]: {
        name: WinstonLog.KafkaConsumerOpened,
        level: WinstonLevel.Info,
        loki: false,
        messageType: {
        },
    },
    // Kafka Consumer Closed
    [WinstonLog.KafkaConsumerClosed]: {
        name: WinstonLog.KafkaConsumerClosed,
        level: WinstonLevel.Error,
        loki: false,
        messageType: {
        },
    },
    // Kafka Consumer Error
    [WinstonLog.KafkaConsumerError]: {
        name: WinstonLog.KafkaConsumerError,
        level: WinstonLevel.Info,
        loki: false,
        messageType: {
        },
    },
    // Withdraw Transaction Executed
    [WinstonLog.WithdrawTransactionExecuted]: {
        name: WinstonLog.WithdrawTransactionExecuted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawTransactionExecutedMessage,
    },
    // Withdraw Transaction Stimulated
    [WinstonLog.WithdrawTransactionStimulated]: {
        name: WinstonLog.WithdrawTransactionStimulated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawTransactionStimulatedMessage,
    },
    // Reconcile Balance Transaction Executed
    [WinstonLog.ReconcileBalanceTransactionExecuted]: {
        name: WinstonLog.ReconcileBalanceTransactionExecuted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceTransactionExecutedMessage,
    },
    // Reconcile Balance Transaction Stimulated
    [WinstonLog.ReconcileBalanceTransactionStimulated]: {
        name: WinstonLog.ReconcileBalanceTransactionStimulated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceTransactionStimulatedMessage,
    },
    // Reconcile Balance Job Prepared
    [WinstonLog.ReconcileBalanceJobPrepared]: {
        name: WinstonLog.ReconcileBalanceJobPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceJobPreparedMessage,
    },
    // Withdraw Transaction Prepared
    [WinstonLog.WithdrawTransactionPrepared]: {
        name: WinstonLog.WithdrawTransactionPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawTransactionPreparedMessage,
    },
    // Close Position Transaction
    [WinstonLog.ClosePositionTransactionExecuted]: {
        name: WinstonLog.ClosePositionTransactionExecuted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ClosePositionTransactionExecutedMessage,
    },
    // Close Position Transaction Failed
    [WinstonLog.ClosePositionTransactionFailed]: {
        name: WinstonLog.ClosePositionTransactionFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ClosePositionTransactionFailedMessage,
    },
    // Liquidity Pool Fetched Error
    [WinstonLog.LiquidityPoolFetchedError]: {
        name: WinstonLog.LiquidityPoolFetchedError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as LiquidityPoolFetchedErrorMessage,
    },
    // Open Position Executed
    [WinstonLog.OpenPositionTransactionExecuted]: {
        name: WinstonLog.OpenPositionTransactionExecuted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionTransactionExecutedMessage,
    },
    // Open Position Transaction Failed
    [WinstonLog.OpenPositionTransactionFailed]: {
        name: WinstonLog.OpenPositionTransactionFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as OpenPositionTransactionFailedMessage,
    },
    // Liquidity Pool WS Error
    [WinstonLog.LiquidityPoolWsError]: {
        name: WinstonLog.LiquidityPoolWsError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as LiquidityPoolWsErrorMessage,
    },
    // Swap Transaction Executed
    [WinstonLog.SwapTransactionExecuted]: {
        name: WinstonLog.SwapTransactionExecuted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as SwapTransactionExecutedMessage,
    },
    // Swap Transaction Failed
    [WinstonLog.SwapTransactionFailed]: {
        name: WinstonLog.SwapTransactionFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as SwapTransactionFailedMessage,
    },
    // Google Drive File Uploaded
    [WinstonLog.GoogleDriveFileUploaded]: {
        name: WinstonLog.GoogleDriveFileUploaded,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as GoogleDriveFileUploadedMessage,
    },
    // Google Drive File Downloaded
    [WinstonLog.GoogleDriveFileDownloaded]: {
        name: WinstonLog.GoogleDriveFileDownloaded,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as GoogleDriveFileDownloadedMessage,
    },
    // Google Drive File Download Error
    [WinstonLog.GoogleDriveFileDownloadError]: {
        name: WinstonLog.GoogleDriveFileDownloadError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as GoogleDriveFileDownloadErrorMessage,
    },
    // Pyth Prices Fetched
    [WinstonLog.PythPricesFetched]: {
        name: WinstonLog.PythPricesFetched,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as PythPricesFetchedMessage,
    },
    // Pyth Prices Fetch Failed
    [WinstonLog.PythPricesFetchFailed]: {
        name: WinstonLog.PythPricesFetchFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as PythPricesFetchFailedMessage,
    },
    // Pyth Subscriptions Opened
    [WinstonLog.PythSubscriptionOpened]: {
        name: WinstonLog.PythSubscriptionOpened,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as PythSubscriptionsOpenedMessage,
    },
    // Pyth Subscriptions Closed
    [WinstonLog.PythSubscriptionClosed]: {
        name: WinstonLog.PythSubscriptionClosed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as PythSubscriptionsClosedMessage,
    },
    // Pyth Subscription Resolved
    [WinstonLog.PythSubscriptionResolved]: {
        name: WinstonLog.PythSubscriptionResolved,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as PythSubscriptionResolvedMessage,
    },
    // Pyth Subscription Error
    [WinstonLog.PythSubscriptionError]: {
        name: WinstonLog.PythSubscriptionError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as PythSubscriptionErrorMessage,
    },
    // Coin Market Cap Prices Fetched
    [WinstonLog.CoinMarketCapPricesFetched]: {
        name: WinstonLog.CoinMarketCapPricesFetched,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as CoinMarketCapPricesFetchedMessage,
    },
    // Coin Market Cap Prices Fetch Failed
    [WinstonLog.CoinMarketCapPricesFetchFailed]: {
        name: WinstonLog.CoinMarketCapPricesFetchFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as CoinMarketCapPricesFetchFailedMessage,
    },
    // Coingecko Prices Fetched
    [WinstonLog.CoingeckoPricesFetched]: {
        name: WinstonLog.CoingeckoPricesFetched,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as CoingeckoPricesFetchedMessage,
    },
    // Coingecko Prices Fetch Failed
    [WinstonLog.CoingeckoPricesFetchFailed]: {
        name: WinstonLog.CoingeckoPricesFetchFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as CoingeckoPricesFetchFailedMessage,
    },
    // No Available RPCs
    [WinstonLog.NoAvailableRpc]: {
        name: WinstonLog.NoAvailableRpc,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as NoAvailableRpcMessage,
    },
    // Open Position Job Enqueued
    [WinstonLog.OpenPositionJobEnqueued]: {
        name: WinstonLog.OpenPositionJobEnqueued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionJobEnqueuedMessage,
    },
    // Open Position Job Enqueue Failed
    [WinstonLog.OpenPositionJobEnqueueFailed]: {
        name: WinstonLog.OpenPositionJobEnqueueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as OpenPositionJobEnqueueFailedMessage,
    },
    // Open Position Job Requeued
    [WinstonLog.OpenPositionJobRequeued]: {
        name: WinstonLog.OpenPositionJobRequeued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionJobRequeuedMessage,
    },
    // Open Position Job Requeue Failed
    [WinstonLog.OpenPositionJobRequeueFailed]: {
        name: WinstonLog.OpenPositionJobRequeueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as OpenPositionJobRequeueFailedMessage,
    },
    // Open Position Skipped - Dynamic Liquidity Pool Info Not Ready
    [WinstonLog.OpenPositionSkippedDynamicLiquidityPoolInfoNotReady]: {
        name: WinstonLog.OpenPositionSkippedDynamicLiquidityPoolInfoNotReady,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as OpenPositionSkippedDynamicLiquidityPoolInfoNotReadyMessage,
    },
    // Open Position Skipped - Price Not Ready
    [WinstonLog.OpenPositionSkippedPriceNotReady]: {
        name: WinstonLog.OpenPositionSkippedPriceNotReady,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as OpenPositionSkippedPriceNotReadyMessage,
    },
    // Close Position Job Enqueued
    [WinstonLog.ClosePositionJobEnqueued]: {
        name: WinstonLog.ClosePositionJobEnqueued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {  
        } as ClosePositionJobEnqueuedMessage,
    },
    // Close Position Job Enqueue Failed
    [WinstonLog.ClosePositionJobEnqueueFailed]: {
        name: WinstonLog.ClosePositionJobEnqueueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ClosePositionJobEnqueueFailedMessage,
    },
    // Close Position Job Requeued
    [WinstonLog.ClosePositionJobRequeued]: {
        name: WinstonLog.ClosePositionJobRequeued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ClosePositionJobRequeuedMessage,
    },
    // Close Position Job Requeue Failed
    [WinstonLog.ClosePositionJobRequeueFailed]: {
        name: WinstonLog.ClosePositionJobRequeueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ClosePositionJobRequeueFailedMessage,
    },
    // Error Decrypting JWT Secret Key
    [WinstonLog.ErrorDecryptingJwtSecretKey]: {
        name: WinstonLog.ErrorDecryptingJwtSecretKey,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ErrorDecryptingJwtSecretKeyMessage,
    },
    // Error Decrypting AES Key
    [WinstonLog.ErrorDecryptingAesKey]: {
        name: WinstonLog.ErrorDecryptingAesKey,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ErrorDecryptingAesKeyMessage,
    },
    // Websocket Subscription Opened
    [WinstonLog.WebsocketSubscriptionOpened]: {
        name: WinstonLog.WebsocketSubscriptionOpened,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as WebsocketSubscriptionOpenedMessage,
    },
    // Websocket Subscription Closed
    [WinstonLog.WebsocketSubscriptionClosed]: {
        name: WinstonLog.WebsocketSubscriptionClosed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as WebsocketSubscriptionClosedMessage,
    },
    // Websocket Subscription Error
    [WinstonLog.WebsocketSubscriptionError]: {
        name: WinstonLog.WebsocketSubscriptionError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as WebsocketSubscriptionErrorMessage,
    },
    // Websocket Subscription Resolved
    [WinstonLog.WebsocketSubscriptionResolved]: {
        name: WinstonLog.WebsocketSubscriptionResolved,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as WebsocketSubscriptionResolvedMessage,
    },
    // Eject RPC Fatal Error
    [WinstonLog.EjectRpcFatalError]: {
        name: WinstonLog.EjectRpcFatalError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as EjectRpcFatalErrorMessage,
    },
    // Eject RPC Retryable Error
    [WinstonLog.EjectRpcRetryableError]: {
        name: WinstonLog.EjectRpcRetryableError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as EjectRpcRetryableErrorMessage,
    },
    // Eject RPC Ignorable Error
    [WinstonLog.EjectRpcIgnorableError]: {
        name: WinstonLog.EjectRpcIgnorableError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as EjectRpcIgnorableErrorMessage,
    },
    // Pyth Rest Prices Fetched
    [WinstonLog.PythRestPricesFetched]: {
        name: WinstonLog.PythRestPricesFetched,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as PythRestPricesFetchedMessage,
    },
    // Pyth Rest Prices Fetch Failed
    [WinstonLog.PythRestPricesFetchFailed]: {
        name: WinstonLog.PythRestPricesFetchFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as PythRestPricesFetchFailedMessage,
    },
    // Cleanup Deployments Error
    [WinstonLog.CleanupDeploymentsError]: {
        name: WinstonLog.CleanupDeploymentsError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as CleanupDeploymentsErrorMessage,
    },
    // Cleanup Services Error
    [WinstonLog.CleanupServicesError]: {
        name: WinstonLog.CleanupServicesError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as CleanupServicesErrorMessage,
    },
    // Deployment Created
    [WinstonLog.DeploymentCreated]: {
        name: WinstonLog.DeploymentCreated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as DeploymentCreatedMessage,
    },
    // Deployment Deleted
    [WinstonLog.DeploymentDeleted]: {
        name: WinstonLog.DeploymentDeleted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as DeploymentDeletedMessage,
    },
    // Deployment Patched
    [WinstonLog.DeploymentPatched]: {
        name: WinstonLog.DeploymentPatched,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as DeploymentPatchedMessage,
    },
    // Deployment Patch Failed
    [WinstonLog.DeploymentPatchFailed]: {
        name: WinstonLog.DeploymentPatchFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as DeploymentPatchFailedMessage,
    },  
    // Deployment Create Failed
    [WinstonLog.DeploymentCreateFailed]: {
        name: WinstonLog.DeploymentCreateFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as DeploymentCreateFailedMessage,
    },
    // Deployment Delete Failed
    [WinstonLog.DeploymentDeleteFailed]: {
        name: WinstonLog.DeploymentDeleteFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as DeploymentDeleteFailedMessage,
    },
    // Service Created
    [WinstonLog.ServiceCreated]: {
        name: WinstonLog.ServiceCreated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ServiceCreatedMessage,
    },
    // Service Deleted
    [WinstonLog.ServiceDeleted]: {
        name: WinstonLog.ServiceDeleted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ServiceDeletedMessage,
    },
    // Service Create Failed
    [WinstonLog.ServiceCreateFailed]: {
        name: WinstonLog.ServiceCreateFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ServiceCreateFailedMessage,
    },
    // Service Delete Failed
    [WinstonLog.ServiceDeleteFailed]: {
        name: WinstonLog.ServiceDeleteFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ServiceDeleteFailedMessage,
    },
    // Coordinator Executors Created
    [WinstonLog.CoordinatorExecutorsCreated]: {
        name: WinstonLog.CoordinatorExecutorsCreated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as CoordinatorExecutorsCreatedMessage,
    },
    // Coordinator Executors Deleted
    [WinstonLog.CoordinatorExecutorsDeleted]: {
        name: WinstonLog.CoordinatorExecutorsDeleted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as CoordinatorExecutorsDeletedMessage,
    },
    // Coordinator Executors Updated
    [WinstonLog.CoordinatorExecutorsUpdated]: {
        name: WinstonLog.CoordinatorExecutorsUpdated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as CoordinatorExecutorsUpdatedMessage,
    },
    // Coordinator Primary Mongo Db Change Stream Error
    [WinstonLog.CoordinatorPrimaryMongoDbChangeStreamError]: {
        name: WinstonLog.CoordinatorPrimaryMongoDbChangeStreamError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as CoordinatorPrimaryMongoDbChangeStreamErrorMessage,
    },
    // Coordinator Primary Mongo Db Change Stream Close
    [WinstonLog.CoordinatorPrimaryMongoDbChangeStreamClose]: {
        name: WinstonLog.CoordinatorPrimaryMongoDbChangeStreamClose,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as CoordinatorPrimaryMongoDbChangeStreamCloseMessage,
    },
    // Coordinator Primary Mongo Db Change Stream Started
    [WinstonLog.CoordinatorPrimaryMongoDbChangeStreamStarted]: {
        name: WinstonLog.CoordinatorPrimaryMongoDbChangeStreamStarted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as CoordinatorPrimaryMongoDbChangeStreamStartedMessage,
    },
    // Coordinator Primary Mongo Db Change Stream Executor Created
    [WinstonLog.CoordinatorPrimaryMongoDbChangeStreamExecutorCreated]: {
        name: WinstonLog.CoordinatorPrimaryMongoDbChangeStreamExecutorCreated,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as CoordinatorPrimaryMongoDbChangeStreamExecutorCreatedMessage,
    },
    // Coordinator Primary Mongo Db Change Stream Executor Deleted
    [WinstonLog.CoordinatorPrimaryMongoDbChangeStreamExecutorDeleted]: {
        name: WinstonLog.CoordinatorPrimaryMongoDbChangeStreamExecutorDeleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as CoordinatorPrimaryMongoDbChangeStreamExecutorDeletedMessage,
    },
    // Coordinator Primary Mongo Db Change Stream Executor Updated
    [WinstonLog.CoordinatorPrimaryMongoDbChangeStreamExecutorUpdated]: {
        name: WinstonLog.CoordinatorPrimaryMongoDbChangeStreamExecutorUpdated,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as CoordinatorPrimaryMongoDbChangeStreamExecutorUpdatedMessage,
    },
    // Executor Bots Updated
    [WinstonLog.ExecutorBotsUpdated]: {
        name: WinstonLog.ExecutorBotsUpdated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ExecutorBotsUpdatedMessage,
    },
    // Executor Bots Created
    [WinstonLog.ExecutorBotsCreated]: {
        name: WinstonLog.ExecutorBotsCreated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ExecutorBotsCreatedMessage,
    },
    // Executor Bots Deleted
    [WinstonLog.ExecutorBotsDeleted]: {
        name: WinstonLog.ExecutorBotsDeleted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ExecutorBotsDeletedMessage,
    },
    // Executor Mongo Db Change Stream Error
    [WinstonLog.ExecutorMongoDbChangeStreamError]: {
        name: WinstonLog.ExecutorMongoDbChangeStreamError,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ExecutorMongoDbChangeStreamErrorMessage,
    },
    // Executor Mongo Db Change Stream Close
    [WinstonLog.ExecutorMongoDbChangeStreamClose]: {
        name: WinstonLog.ExecutorMongoDbChangeStreamClose,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ExecutorMongoDbChangeStreamCloseMessage,
    },
    // Executor Mongo Db Change Stream Started
    [WinstonLog.ExecutorMongoDbChangeStreamStarted]: {
        name: WinstonLog.ExecutorMongoDbChangeStreamStarted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ExecutorMongoDbChangeStreamStartedMessage,
    },
    // Executor Mongo Db Change Stream Bot Updated
    [WinstonLog.ExecutorMongoDbChangeStreamBotUpdated]: {
        name: WinstonLog.ExecutorMongoDbChangeStreamBotUpdated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ExecutorMongoDbChangeStreamBotUpdatedMessage,
    },
    // Executor Runtime Initialization Failed
    [WinstonLog.ExecutorRuntimeInitializationFailed]: {
        name: WinstonLog.ExecutorRuntimeInitializationFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ExecutorRuntimeInitializationFailedMessage,
    },
    // Coordinator Runtime Initialization Failed
    [WinstonLog.CoordinatorRuntimeInitializationFailed]: {
        name: WinstonLog.CoordinatorRuntimeInitializationFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as CoordinatorRuntimeInitializationFailedMessage,
    },
    // Executor Not Found
    [WinstonLog.ExecutorNotFound]: {
        name: WinstonLog.ExecutorNotFound,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ExecutorNotFoundMessage,
    },
    // Reconcile Balance Enqueue Failed
    [WinstonLog.ReconcileBalanceJobEnqueueFailed]: {
        name: WinstonLog.ReconcileBalanceJobEnqueueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ReconcileBalanceJobEnqueueFailedMessage,
    },
    // Reconcile Balance Enqueued
    [WinstonLog.ReconcileBalanceJobEnqueued]: {
        name: WinstonLog.ReconcileBalanceJobEnqueued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceJobEnqueuedMessage,
    },
    // Reconcile Balance Job Requeue Failed
    [WinstonLog.ReconcileBalanceJobRequeueFailed]: {
        name: WinstonLog.ReconcileBalanceJobRequeueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ReconcileBalanceJobRequeueFailedMessage,
    },
    // Reconcile Balance Job Requeued
    [WinstonLog.ReconcileBalanceJobRequeued]: {
        name: WinstonLog.ReconcileBalanceJobRequeued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceJobRequeuedMessage,
    },
    // Withdraw Job Scheduled
    [WinstonLog.WithdrawJobScheduled]: {
        name: WinstonLog.WithdrawJobScheduled,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawJobScheduledMessage,
    },
    // Withdraw Job Enqueue Failed
    [WinstonLog.WithdrawJobEnqueueFailed]: {
        name: WinstonLog.WithdrawJobEnqueueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as WithdrawJobEnqueueFailedMessage,
    },
    // Withdraw Job Enqueued
    [WinstonLog.WithdrawJobEnqueued]: {
        name: WinstonLog.WithdrawJobEnqueued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawJobEnqueuedMessage,
    },
    // Withdraw Job Requeued
    [WinstonLog.WithdrawJobRequeued]: {
        name: WinstonLog.WithdrawJobRequeued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawJobRequeuedMessage,
    },
    // Withdraw Job Requeue Failed
    [WinstonLog.WithdrawJobRequeueFailed]: {
        name: WinstonLog.WithdrawJobRequeueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as WithdrawJobRequeueFailedMessage,
    },
    // Reconcile Balance Job Completed
    [WinstonLog.ReconcileBalanceJobCompleted]: {
        name: WinstonLog.ReconcileBalanceJobCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as ReconcileBalanceJobCompletedMessage,
    },
    // Reconcile Balance Processing Started
    [WinstonLog.ReconcileBalanceProcessingStarted]: {
        name: WinstonLog.ReconcileBalanceProcessingStarted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as ReconcileBalanceProcessingStartedMessage,
    },
    // Withdraw Job Completed
    [WinstonLog.WithdrawJobCompleted]: {
        name: WinstonLog.WithdrawJobCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as WithdrawJobCompletedMessage,
    },
    // Withdraw Job Started
    [WinstonLog.WithdrawJobStarted]: {
        name: WinstonLog.WithdrawJobStarted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as WithdrawJobStartedMessage,
    },
    // Reconcile Balance Job Failed
    [WinstonLog.ReconcileBalanceJobFailed]: {
        name: WinstonLog.ReconcileBalanceJobFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as JobFailedMessage,
    },
    // Withdraw Job Failed
    [WinstonLog.WithdrawJobFailed]: {
        name: WinstonLog.WithdrawJobFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as JobFailedMessage,
    },
    // Price Diagnostic Failed
    [WinstonLog.PriceDiagnosticFailed]: {
        name: WinstonLog.PriceDiagnosticFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as PriceDiagnosticFailedMessage,
    },
    // Price Diagnostic Success
    [WinstonLog.PriceDiagnosticSuccess]: {
        name: WinstonLog.PriceDiagnosticSuccess,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as PriceDiagnosticSuccessMessage,
    },
    // Price Diagnostic Warning
    [WinstonLog.PriceDiagnosticFailedStale]: {
        name: WinstonLog.PriceDiagnosticFailedStale,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as PriceDiagnosticFailedStaleMessage,
    },
    // Price Diagnostic Failed Not Found
    [WinstonLog.PriceDiagnosticFailedNotFound]: {
        name: WinstonLog.PriceDiagnosticFailedNotFound,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as PriceDiagnosticFailedNotFoundMessage,
    },
    // Dynamic Liquidity Pool Info Diagnostic Failed
    [WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailed]: {
        name: WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailed,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as DynamicLiquidityPoolInfoDiagnosticFailedMessage,
    },
    // Dynamic Liquidity Pool Info Diagnostic Failed Not Found
    [WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedNotFound]: {
        name: WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedNotFound,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as DynamicLiquidityPoolInfoDiagnosticFailedNotFoundMessage,
    },
    // Dynamic Liquidity Pool Info Diagnostic Failed Stale
    [WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedStale]: {
        name: WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedStale,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as DynamicLiquidityPoolInfoDiagnosticFailedStaleMessage,
    },
    // Dynamic Liquidity Pool Info Diagnostic Success
    [WinstonLog.DynamicLiquidityPoolInfoDiagnosticSuccess]: {
        name: WinstonLog.DynamicLiquidityPoolInfoDiagnosticSuccess,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as DynamicLiquidityPoolInfoDiagnosticSuccessMessage,
    },
    // Swap Transaction Stimulated
    [WinstonLog.SwapTransactionStimulated]: {
        name: WinstonLog.SwapTransactionStimulated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as SwapTransactionStimulatedMessage,
    },
    // Swap Transaction Prepared
    [WinstonLog.SwapTransactionPrepared]: {
        name: WinstonLog.SwapTransactionPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as SwapTransactionPreparedMessage,
    },
    // Reconcile Balance Prepared
    [WinstonLog.ReconcileBalancePrepared]: {
        name: WinstonLog.ReconcileBalancePrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalancePreparedMessage,
    },
    // Withdraw Prepared
    [WinstonLog.WithdrawPrepared]: {
        name: WinstonLog.WithdrawPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawPreparedMessage,
    },
    // Reconcile Balance Requeue Failed
    [WinstonLog.ReconcileBalanceRequeueFailed]: {
        name: WinstonLog.ReconcileBalanceRequeueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ReconcileBalanceRequeueFailedMessage,
    },
    // Reconcile Balance Job Already Prepared
    [WinstonLog.ReconcileBalanceJobAlreadyPrepared]: {
        name: WinstonLog.ReconcileBalanceJobAlreadyPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceJobAlreadyPreparedMessage,
    },
    // Reconcile Balance Job Already Executed
    [WinstonLog.ReconcileBalanceJobAlreadyExecuted]: {
        name: WinstonLog.ReconcileBalanceJobAlreadyExecuted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceJobAlreadyExecutedMessage,
    },
    // Reconcile Balance Job Already Confirmed
    [WinstonLog.ReconcileBalanceJobAlreadyConfirmed]: {
        name: WinstonLog.ReconcileBalanceJobAlreadyConfirmed,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceJobAlreadyConfirmedMessage,
    },
    // Reconcile Balance Job Confirmed
    [WinstonLog.ReconcileBalanceJobConfirmed]: {
        name: WinstonLog.ReconcileBalanceJobConfirmed,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceJobConfirmedMessage,
    },
    // Withdraw Requeue Failed
    [WinstonLog.WithdrawRequeueFailed]: {
        name: WinstonLog.WithdrawRequeueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as WithdrawRequeueFailedMessage,
    },
    // Withdraw Job Prepared
    [WinstonLog.WithdrawJobPrepared]: {
        name: WinstonLog.WithdrawJobPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawJobPreparedMessage,
    },
    // Withdraw Job Confirmed
    [WinstonLog.WithdrawJobConfirmed]: {
        name: WinstonLog.WithdrawJobConfirmed,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawJobConfirmedMessage,
    },
    // Withdraw Job Already Prepared
    [WinstonLog.WithdrawJobAlreadyPrepared]: {
        name: WinstonLog.WithdrawJobAlreadyPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawJobAlreadyPreparedMessage,
    },
    // Withdraw Job Already Executed
    [WinstonLog.WithdrawJobAlreadyExecuted]: {
        name: WinstonLog.WithdrawJobAlreadyExecuted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawJobAlreadyExecutedMessage,
    },
    // Withdraw Job Already Confirmed
    [WinstonLog.WithdrawJobAlreadyConfirmed]: {
        name: WinstonLog.WithdrawJobAlreadyConfirmed,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawJobAlreadyConfirmedMessage,
    },
    // Open Position Job Already Prepared
    [WinstonLog.OpenPositionJobAlreadyPrepared]: {
        name: WinstonLog.OpenPositionJobAlreadyPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionJobAlreadyPreparedMessage,
    },
    // Open Position Job Already Executed
    [WinstonLog.OpenPositionJobAlreadyExecuted]: {
        name: WinstonLog.OpenPositionJobAlreadyExecuted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionJobAlreadyExecutedMessage,
    },
    // Open Position Job Already Confirmed
    [WinstonLog.OpenPositionJobAlreadyConfirmed]: {
        name: WinstonLog.OpenPositionJobAlreadyConfirmed,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionJobAlreadyConfirmedMessage,
    },
    // Close Position Job Prepared
    [WinstonLog.ClosePositionJobPrepared]: {
        name: WinstonLog.ClosePositionJobPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ClosePositionJobPreparedMessage,
    },
    // Close Position Job Already Prepared
    [WinstonLog.ClosePositionJobAlreadyPrepared]: {
        name: WinstonLog.ClosePositionJobAlreadyPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ClosePositionJobAlreadyPreparedMessage,
    },
    // Close Position Job Already Executed
    [WinstonLog.ClosePositionJobAlreadyExecuted]: {
        name: WinstonLog.ClosePositionJobAlreadyExecuted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ClosePositionJobAlreadyExecutedMessage,
    },
    // Close Position Job Already Confirmed
    [WinstonLog.ClosePositionJobAlreadyConfirmed]: {
        name: WinstonLog.ClosePositionJobAlreadyConfirmed,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ClosePositionJobAlreadyConfirmedMessage,
    },
    // Close Position Job Confirmed
    [WinstonLog.ClosePositionJobConfirmed]: {
        name: WinstonLog.ClosePositionJobConfirmed,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ClosePositionJobConfirmedMessage,
    },
    // Close Position Job Failed
    [WinstonLog.ClosePositionJobFailed]: {
        name: WinstonLog.ClosePositionJobFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as JobFailedMessage,
    },
    // Close Position Job Completed
    [WinstonLog.ClosePositionJobCompleted]: {
        name: WinstonLog.ClosePositionJobCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as ClosePositionJobCompletedMessage,
    },
    // Open Position Job Failed
    [WinstonLog.OpenPositionJobFailed]: {
        name: WinstonLog.OpenPositionJobFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as JobFailedMessage,
    },
    // Open Position Job Completed
    [WinstonLog.OpenPositionJobCompleted]: {
        name: WinstonLog.OpenPositionJobCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as OpenPositionJobCompletedMessage,
    },
    // Open Position Job Started
    [WinstonLog.OpenPositionJobStarted]: {
        name: WinstonLog.OpenPositionJobStarted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as OpenPositionJobStartedMessage,
    },
    // Open Position Requeue Failed
    [WinstonLog.OpenPositionRequeueFailed]: {
        name: WinstonLog.OpenPositionRequeueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as OpenPositionRequeueFailedMessage,
    },
    // Close Position Requeue Failed
    [WinstonLog.ClosePositionRequeueFailed]: {
        name: WinstonLog.ClosePositionRequeueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ClosePositionRequeueFailedMessage,
    },
    // Diagnostics Ready
    [WinstonLog.DiagnosticsReady]: {
        name: WinstonLog.DiagnosticsReady,
        level: WinstonLevel.Info,
        loki: false,
        messageType: {
        } as DiagnosticsReadyMessage,
    },
    // Open Position Transaction Stimulated
    [WinstonLog.OpenPositionTransactionStimulated]: {
        name: WinstonLog.OpenPositionTransactionStimulated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionTransactionStimulatedMessage,
    },
    // Close Position Transaction Stimulated
    [WinstonLog.ClosePositionTransactionStimulated]: {
        name: WinstonLog.ClosePositionTransactionStimulated,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ClosePositionTransactionStimulatedMessage,
    },
    // Open Position Job Prepared
    [WinstonLog.OpenPositionJobPrepared]: {
        name: WinstonLog.OpenPositionJobPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionJobPreparedMessage,
    },
    // Close Position Transaction Found
    [WinstonLog.ClosePositionTransactionFound]: {
        name: WinstonLog.ClosePositionTransactionFound,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ClosePositionTransactionFoundMessage,
    },
    // Open Position Transaction Found
    [WinstonLog.OpenPositionTransactionFound]: {
        name: WinstonLog.OpenPositionTransactionFound,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionTransactionFoundMessage,
    },
    // Swap Transaction Found
    [WinstonLog.SwapTransactionFound]: {
        name: WinstonLog.SwapTransactionFound,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as SwapTransactionFoundMessage,
    },
    // Open Position Bootstrapping Failed
    [WinstonLog.OpenPositionBootstrappingFailed]: {
        name: WinstonLog.OpenPositionBootstrappingFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as OpenPositionBootstrappingFailedMessage,
    },
    // Close Position Bootstrapping Failed
    [WinstonLog.ClosePositionBootstrappingFailed]: {
        name: WinstonLog.ClosePositionBootstrappingFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ClosePositionBootstrappingFailedMessage,
    },
    // Reconcile Balance Bootstrapping Failed
    [WinstonLog.ReconcileBalanceBootstrappingFailed]: {
        name: WinstonLog.ReconcileBalanceBootstrappingFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ReconcileBalanceBootstrappingFailedMessage,
    },
    // Withdraw Bootstrapping Failed
    [WinstonLog.WithdrawBootstrappingFailed]: {
        name: WinstonLog.WithdrawBootstrappingFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as WithdrawBootstrappingFailedMessage,
    },
    // Open Position Job Already Enqueued
    [WinstonLog.OpenPositionJobAlreadyEnqueued]: {
        name: WinstonLog.OpenPositionJobAlreadyEnqueued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionJobAlreadyEnqueuedMessage,
    },
    // Close Position Job Already Enqueued
    [WinstonLog.ClosePositionJobAlreadyEnqueued]: {
        name: WinstonLog.ClosePositionJobAlreadyEnqueued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ClosePositionJobAlreadyEnqueuedMessage,
    },
    // Reconcile Balance Job Already Enqueued
    [WinstonLog.ReconcileBalanceJobAlreadyEnqueued]: {
        name: WinstonLog.ReconcileBalanceJobAlreadyEnqueued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceJobAlreadyEnqueuedMessage,
    },
    // Withdraw Job Already Enqueued
    [WinstonLog.WithdrawJobAlreadyEnqueued]: {
        name: WinstonLog.WithdrawJobAlreadyEnqueued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawJobAlreadyEnqueuedMessage,
    },
    // Cannot Settle Position
    [WinstonLog.CannotSettlePosition]: {
        name: WinstonLog.CannotSettlePosition,
        level: WinstonLevel.Verbose,
        loki: false,
        messageType: {
        } as CannotSettlePositionMessage,
    },
    // Close Position Transaction Prepared
    [WinstonLog.ClosePositionTransactionPrepared]: {
        name: WinstonLog.ClosePositionTransactionPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ClosePositionTransactionPreparedMessage,
    },
    // Open Position Job Confirmed
    [WinstonLog.OpenPositionJobConfirmed]: {
        name: WinstonLog.OpenPositionJobConfirmed,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionJobConfirmedMessage,
    },
    // Clmm Liquidity Pools Synced Diagnostic
    [WinstonLog.ClmmLiquidityPoolsSyncedDiagnostic]: {
        name: WinstonLog.ClmmLiquidityPoolsSyncedDiagnostic,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ClmmLiquidityPoolsSyncedDiagnosticMessage,
    },
    // Dlmm Liquidity Pools Synced Diagnostic
    [WinstonLog.DlmmLiquidityPoolsSyncedDiagnostic]: {
        name: WinstonLog.DlmmLiquidityPoolsSyncedDiagnostic,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as DlmmLiquidityPoolsSyncedDiagnosticMessage,
    },
    // Liquidity Pools Became Ready
    [WinstonLog.LiquidityPoolsBecameReady]: {
        name: WinstonLog.LiquidityPoolsBecameReady,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as LiquidityPoolsBecameReadyMessage,
    },
    // Liquidity Pools Became Not Ready
    [WinstonLog.LiquidityPoolsBecameNotReady]: {
        name: WinstonLog.LiquidityPoolsBecameNotReady,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as LiquidityPoolsBecameNotReadyMessage,
    },
    // Socket Io Client Connected
    [WinstonLog.SocketIoClientConnected]: {
        name: WinstonLog.SocketIoClientConnected,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as SocketIoClientConnectedMessage,
    },
    // Socket Io Client Disconnected
    [WinstonLog.SocketIoClientDisconnected]: {
        name: WinstonLog.SocketIoClientDisconnected,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as SocketIoClientDisconnectedMessage,
    },
    // Mongo Dump Completed
    [WinstonLog.MongoDumpCompleted]: {
        name: WinstonLog.MongoDumpCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as MongoDumpCompletedMessage,
    },
    // SevenZ Compression Completed
    [WinstonLog.SevenZCompressionCompleted]: {
        name: WinstonLog.SevenZCompressionCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as SevenZCompressionCompletedMessage,
    },
    // Backup Completed
    [WinstonLog.BackupCompleted]: {
        name: WinstonLog.BackupCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as BackupCompletedMessage,
    },
    // Backup Failed
    [WinstonLog.BackupFailed]: {
        name: WinstonLog.BackupFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as BackupFailedMessage,
    },
    // SevenZ Extraction Completed
    [WinstonLog.SevenZExtractionCompleted]: {
        name: WinstonLog.SevenZExtractionCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as SevenZExtractionCompletedMessage,
    },
    // MongoDB Restore Completed
    [WinstonLog.MongoDBRestoreCompleted]: {
        name: WinstonLog.MongoDBRestoreCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as MongoDBRestoreCompletedMessage,
    },
    // Restore Completed
    [WinstonLog.RestoreCompleted]: {
        name: WinstonLog.RestoreCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as RestoreCompletedMessage,
    },
    // Restore Failed
    [WinstonLog.RestoreFailed]: {
        name: WinstonLog.RestoreFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as RestoreFailedMessage,
    },
    // Seed Completed
    [WinstonLog.SeedCompleted]: {
        name: WinstonLog.SeedCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        }
    },
    // Seed Failed
    [WinstonLog.SeedFailed]: {
        name: WinstonLog.SeedFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        }
    },
    // Migration Started
    [WinstonLog.MigrationStarted]: {
        name: WinstonLog.MigrationStarted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        }
    },
    // Migration Open Snapshots Updated
    [WinstonLog.MigrationOpenSnapshotsUpdated]: {
        name: WinstonLog.MigrationOpenSnapshotsUpdated,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as MigrationOpenSnapshotsUpdatedMessage,
    },
    // Migration Close Snapshots Updated
    [WinstonLog.MigrationCloseSnapshotsUpdated]: {
        name: WinstonLog.MigrationCloseSnapshotsUpdated,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as MigrationCloseSnapshotsUpdatedMessage,
    },
    // Migration Completed
    [WinstonLog.MigrationCompleted]: {
        name: WinstonLog.MigrationCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as MigrationCompletedMessage,
    },
    // Migration Failed
    [WinstonLog.MigrationFailed]: {
        name: WinstonLog.MigrationFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as MigrationFailedMessage,
    },
    // Migration Avatars Completed
    [WinstonLog.MigrationAvatarsCompleted]: {
        name: WinstonLog.MigrationAvatarsCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as MigrationAvatarsCompletedMessage,
    },
    // Migration Avatars Failed
    [WinstonLog.MigrationAvatarsFailed]: {
        name: WinstonLog.MigrationAvatarsFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as MigrationAvatarsFailedMessage,
    },
    // Migration User Totp Completed
    [WinstonLog.MigrationUserTotpCompleted]: {
        name: WinstonLog.MigrationUserTotpCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as MigrationUserTotpCompletedMessage,
    },
    // Migration User Totp Failed
    [WinstonLog.MigrationUserTotpFailed]: {
        name: WinstonLog.MigrationUserTotpFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as MigrationUserTotpFailedMessage,
    },
    // Migration Bot Executor Completed
    [WinstonLog.MigrationBotExecutorCompleted]: {
        name: WinstonLog.MigrationBotExecutorCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as MigrationBotExecutorCompletedMessage,
    },
    // Migration Bot Executor Failed
    [WinstonLog.MigrationBotExecutorFailed]: {
        name: WinstonLog.MigrationBotExecutorFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as MigrationBotExecutorFailedMessage,
    },
    // Key Generated Success
    [WinstonLog.KeyGeneratedSuccess]: {
        name: WinstonLog.KeyGeneratedSuccess,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        }
    },
    // Key Generation Failed
    [WinstonLog.KeyGenerationFailed]: {
        name: WinstonLog.KeyGenerationFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as KeyGenerationFailedMessage,
    },
    // Key Encrypted Success
    [WinstonLog.KeyEncryptedSuccess]: {
        name: WinstonLog.KeyEncryptedSuccess,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        }
    },
    // Key Decryption Check Failed
    [WinstonLog.KeyDecryptionCheckFailed]: {
        name: WinstonLog.KeyDecryptionCheckFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as KeyDecryptionCheckFailedMessage,
    },
    // Key Decryption Check Success
    [WinstonLog.KeyDecryptionCheckSuccess]: {
        name: WinstonLog.KeyDecryptionCheckSuccess,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        }
    },
    // Key Written Success
    [WinstonLog.KeyWrittenSuccess]: {
        name: WinstonLog.KeyWrittenSuccess,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as KeyWrittenSuccessMessage,
    },
    // Command Error
    [WinstonLog.CommandError]: {
        name: WinstonLog.CommandError,
        level: WinstonLevel.Error,
        loki: false,
        messageType: {
        } as CommandErrorMessage,
    },
    // Eval Snapshot
    [WinstonLog.EvalSnapshotsChecked]: {
        name: WinstonLog.EvalSnapshotsChecked,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as EvalSnapshotMessage,
    },
    // Error Getting Cache
    [WinstonLog.ErrorGettingCache]: {
        name: WinstonLog.ErrorGettingCache,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ErrorGettingCacheMessage,
    },
    // Error Setting Cache
    [WinstonLog.ErrorSettingCache]: {
        name: WinstonLog.ErrorSettingCache,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ErrorSettingCacheMessage,
    },
    // Error Deleting Cache
    [WinstonLog.ErrorDeletingCache]: {
        name: WinstonLog.ErrorDeletingCache,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ErrorDeletingCacheMessage,
    },
    // Cache Debug Ok Redis
    [WinstonLog.CacheDebugOkRedis]: {
        name: WinstonLog.CacheDebugOkRedis,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as CacheDebugOkRedisMessage,
    },
    // Cache Debug Ok Memory
    [WinstonLog.CacheDebugOkMemory]: {
        name: WinstonLog.CacheDebugOkMemory,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as CacheDebugOkMemoryMessage,
    },
    // Lock Authority Notify Expired Locks Failed
    [WinstonLog.LockAuthorityNotifyExpiredLocksFailed]: {
        name: WinstonLog.LockAuthorityNotifyExpiredLocksFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as LockAuthorityNotifyExpiredLocksFailedMessage,
    },
    // Lock Authority Acquired
    [WinstonLog.LockAuthorityAcquired]: {
        name: WinstonLog.LockAuthorityAcquired,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as LockAuthorityAcquiredMessage,
    },
    // Lock Authority Acquire Failed
    [WinstonLog.LockAuthorityAcquireFailed]: {
        name: WinstonLog.LockAuthorityAcquireFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as LockAuthorityAcquireFailedMessage,
    },
    // Lock Authority Release Failed
    [WinstonLog.LockAuthorityReleaseFailed]: {
        name: WinstonLog.LockAuthorityReleaseFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as LockAuthorityReleaseFailedMessage,
    },
    // Lock Authority Send Heartbeat Failed
    [WinstonLog.LockAuthoritySendHeartbeatFailed]: {
        name: WinstonLog.LockAuthoritySendHeartbeatFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as LockAuthoritySendHeartbeatFailedMessage,
    },
    // Withdraw Transaction Found
    [WinstonLog.WithdrawTransactionFound]: {
        name: WinstonLog.WithdrawTransactionFound,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as WithdrawTransactionFoundMessage,
    },
    // Reconcile Balance Transaction Found
    [WinstonLog.ReconcileBalanceTransactionFound]: {
        name: WinstonLog.ReconcileBalanceTransactionFound,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceTransactionFoundMessage,
    },
    // Reconcile Balance Skipped Bot Not Running
    [WinstonLog.ReconcileBalanceSkippedBotNotRunning]: {
        name: WinstonLog.ReconcileBalanceSkippedBotNotRunning,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ReconcileBalanceSkippedBotNotRunningMessage,
    },
    // Reconcile Balance Skipped Bot Already Has Active Position
    [WinstonLog.ReconcileBalanceSkippedBotAlreadyHasActivePosition]: {
        name: WinstonLog.ReconcileBalanceSkippedBotAlreadyHasActivePosition,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ReconcileBalanceSkippedBotAlreadyHasActivePositionMessage,
    },
    // Reconcile Balance Skipped Balance Snapshot Within Cooldown
    [WinstonLog.ReconcileBalanceSkippedBalanceSnapshotWithinCooldown]: {
        name: WinstonLog.ReconcileBalanceSkippedBalanceSnapshotWithinCooldown,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ReconcileBalanceSkippedBalanceSnapshotWithinCooldownMessage,
    },
    // Reconcile Balance Skipped Bot Already Has Active Job
    [WinstonLog.ReconcileBalanceSkippedBotAlreadyHasActiveJob]: {
        name: WinstonLog.ReconcileBalanceSkippedBotAlreadyHasActiveJob,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ReconcileBalanceSkippedBotAlreadyHasActiveJobMessage,
    },
    // Reconcile Balance Skipped Active Job Found In Queue
    [WinstonLog.ReconcileBalanceSkippedActiveJobFoundInQueue]: {
        name: WinstonLog.ReconcileBalanceSkippedActiveJobFoundInQueue,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ReconcileBalanceSkippedActiveJobFoundInQueueMessage,
    },
    // Reconcile Balance Lock Authority Not Acquired
    [WinstonLog.ReconcileBalanceLockAuthorityNotAcquired]: {
        name: WinstonLog.ReconcileBalanceLockAuthorityNotAcquired,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ReconcileBalanceLockAuthorityNotAcquiredMessage,
    },
    // Reconcile Balance Lock Authority Released
    [WinstonLog.ReconcileBalanceLockAuthorityReleased]: {
        name: WinstonLog.ReconcileBalanceLockAuthorityReleased,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ReconcileBalanceLockAuthorityReleasedMessage,
    },
    // Open Position Lock Authority Not Acquired
    [WinstonLog.OpenPositionLockAuthorityNotAcquired]: {
        name: WinstonLog.OpenPositionLockAuthorityNotAcquired,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as OpenPositionLockAuthorityNotAcquiredMessage,
    },
    // Open Position Lock Authority Released
    [WinstonLog.OpenPositionLockAuthorityReleased]: {
        name: WinstonLog.OpenPositionLockAuthorityReleased,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as OpenPositionLockAuthorityReleasedMessage,
    },
    // Close Position Lock Authority Not Acquired
    [WinstonLog.ClosePositionLockAuthorityNotAcquired]: {
        name: WinstonLog.ClosePositionLockAuthorityNotAcquired,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ClosePositionLockAuthorityNotAcquiredMessage,
    },
    // Close Position Lock Authority Released
    [WinstonLog.ClosePositionLockAuthorityReleased]: {
        name: WinstonLog.ClosePositionLockAuthorityReleased,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ClosePositionLockAuthorityReleasedMessage,
    },
    // Withdraw Lock Authority Released
    [WinstonLog.WithdrawLockAuthorityReleased]: {
        name: WinstonLog.WithdrawLockAuthorityReleased,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as WithdrawLockAuthorityReleasedMessage,
    },
    // Prometheus Metric Initialized
    [WinstonLog.MetricInitialized]: {
        name: WinstonLog.MetricInitialized,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as MetricInitializedMessage,
    },
    // Consul Register Failed
    [WinstonLog.ConsulRegisterFailed]: {
        name: WinstonLog.ConsulRegisterFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ConsulRegisterFailedMessage,
    },
    // Consul Register Successfully
    [WinstonLog.ConsulRegisterSuccessfully]: {
        name: WinstonLog.ConsulRegisterSuccessfully,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ConsulRegisterSuccessfullyMessage,
    },
    // Not Synced Process Open Position
    [WinstonLog.NotSyncedProcessOpenPosition]: {
        name: WinstonLog.NotSyncedProcessOpenPosition,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as NotSyncedProcessOpenPositionMessage,
    },
    // Not Synced Process Close Position
    [WinstonLog.NotSyncedProcessClosePosition]: {
        name: WinstonLog.NotSyncedProcessClosePosition,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as NotSyncedProcessClosePositionMessage,
    },
    // Close Position Skipped Bot Has No Active Position
    [WinstonLog.ClosePositionSkippedBotHasNoActivePosition]: {
        name: WinstonLog.ClosePositionSkippedBotHasNoActivePosition,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ClosePositionSkippedBotHasNoActivePositionMessage,
    },
    // Close Position Skipped Bot Already Has Active Job
    [WinstonLog.ClosePositionSkippedBotAlreadyHasActiveJob]: {
        name: WinstonLog.ClosePositionSkippedBotAlreadyHasActiveJob,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ClosePositionSkippedBotAlreadyHasActiveJobMessage,
    },
    // Close Position Skipped Active Job Found In Queue
    [WinstonLog.ClosePositionSkippedActiveJobFoundInQueue]: {
        name: WinstonLog.ClosePositionSkippedActiveJobFoundInQueue,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ClosePositionSkippedActiveJobFoundInQueueMessage,
    },
    // Rotation Bot Assignments
    [WinstonLog.RotationBotAssignments]: {
        name: WinstonLog.RotationBotAssignments,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as RotationBotAssignmentsMessage,
    },
    // Open Position Skipped Bot Not Running
    [WinstonLog.OpenPositionSkippedBotNotRunning]: {
        name: WinstonLog.OpenPositionSkippedBotNotRunning,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as OpenPositionSkippedBotNotRunningMessage,
    },
    // Open Position Skipped Bot Already Has Active Position
    [WinstonLog.OpenPositionSkippedBotAlreadyHasActivePosition]: {
        name: WinstonLog.OpenPositionSkippedBotAlreadyHasActivePosition,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as OpenPositionSkippedBotAlreadyHasActivePositionMessage,
    },
    // Open Position Skipped Bot Already Has Active Job
    [WinstonLog.OpenPositionSkippedBotAlreadyHasActiveJob]: {
        name: WinstonLog.OpenPositionSkippedBotAlreadyHasActiveJob,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as OpenPositionSkippedBotAlreadyHasActiveJobMessage,
    },
    // Open Position Skipped Not Eligible
    [WinstonLog.OpenPositionSkippedNotEligible]: {
        name: WinstonLog.OpenPositionSkippedNotEligible,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as OpenPositionSkippedNotEligibleMessage,
    },
    // Open Position Skipped No Balance Snapshot
    [WinstonLog.OpenPositionSkippedNoBalanceSnapshot]: {
        name: WinstonLog.OpenPositionSkippedNoBalanceSnapshot,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as OpenPositionSkippedNoBalanceSnapshotMessage,
    },
    // Open Position Skipped Balance Snapshot Too Old
    [WinstonLog.OpenPositionSkippedBalanceSnapshotTooOld]: {
        name: WinstonLog.OpenPositionSkippedBalanceSnapshotTooOld,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as OpenPositionSkippedBalanceSnapshotTooOldMessage,
    },
    // Open Position Skipped Active Job Found In Queue
    [WinstonLog.OpenPositionSkippedActiveJobFoundInQueue]: {
        name: WinstonLog.OpenPositionSkippedActiveJobFoundInQueue,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as OpenPositionSkippedActiveJobFoundInQueueMessage,
    },
    // Liquidity Pools Synced
    [WinstonLog.LiquidityPoolsSyncedMarkedAsReady]: {
        name: WinstonLog.LiquidityPoolsSyncedMarkedAsReady,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as LiquidityPoolsSyncedMarkedAsReadyMessage,
    },
    // Clmm Liquidity Pools Synced
    [WinstonLog.ClmmLiquidityPoolsSynced]: {
        name: WinstonLog.ClmmLiquidityPoolsSynced,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as ClmmLiquidityPoolsSyncedMessage,
    },
    // Dlmm Liquidity Pools Synced
    [WinstonLog.DlmmLiquidityPoolsSynced]: {
        name: WinstonLog.DlmmLiquidityPoolsSynced,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as DlmmLiquidityPoolsSyncedMessage,
    },
    // Job Enqueued
    [WinstonLog.JobEnqueued]: {
        name: WinstonLog.JobEnqueued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as JobEnqueuedMessage,
    },
    // Job Enqueue Failed
    [WinstonLog.JobEnqueueFailed]: {
        name: WinstonLog.JobEnqueueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as JobEnqueueFailedMessage,
    },
    // Action Job Completed
    [WinstonLog.ActionJobCompleted]: {
        name: WinstonLog.ActionJobCompleted,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ActionJobCompletedMessage,
    },
    // Action Job Failed
    [WinstonLog.ActionJobFailed]: {
        name: WinstonLog.ActionJobFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ActionJobFailedMessage,
    },
    // Action Job Context Load Failed
    [WinstonLog.ActionJobContextLoadFailed]: {
        name: WinstonLog.ActionJobContextLoadFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ActionJobContextLoadFailedMessage,
    },
    // Active Job Prepared
    [WinstonLog.ActiveJobTaskPrepared]: {
        name: WinstonLog.ActiveJobTaskPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ActiveJobTaskPreparedMessage,
    },
    // Transaction Signed
    [WinstonLog.TransactionSigned]: {
        name: WinstonLog.TransactionSigned,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as TransactionSignedMessage,
    },
    // Action Job Confirmed
    [WinstonLog.ActionJobTaskConfirmed]: {
        name: WinstonLog.ActionJobTaskConfirmed,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ActionJobTaskConfirmedMessage,
    },
    // Reconcile Balance Plan Determined
    [WinstonLog.ReconcileBalancePlanDetermined]: {
        name: WinstonLog.ReconcileBalancePlanDetermined,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalancePlanDeterminedMessage,
    },
    // Action Skipped Active Job Found In Queue
    [WinstonLog.JobSkippedFoundInQueue]: {
        name: WinstonLog.JobSkippedFoundInQueue,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as JobSkippedFoundInQueueMessage,
    },
    // Action Job Skipped Not Found In Database
    [WinstonLog.JobSkippedNotFoundInDatabase]: {
        name: WinstonLog.JobSkippedNotFoundInDatabase,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as JobSkippedNotFoundInDatabaseMessage,
    },
    // Action Job Skipped Authority Not Acquired
    [WinstonLog.JobSkippedAuthorityNotAcquired]: {
        name: WinstonLog.JobSkippedAuthorityNotAcquired,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as JobSkippedAuthorityNotAcquiredMessage,
    },
    // Job Requeued
    [WinstonLog.JobRequeued]: {
        name: WinstonLog.JobRequeued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as JobRequeuedMessage,
    },
    // Job Requeue Failed
    [WinstonLog.JobRequeueFailed]: {
        name: WinstonLog.JobRequeueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as JobRequeueFailedMessage,
    },
    // Job Skipped Context Load Failed
    [WinstonLog.JobSkippedContextLoadFailed]: {
        name: WinstonLog.JobSkippedContextLoadFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as JobSkippedContextLoadFailedMessage,
    },
    // Job Skipped Bot Already Has Active Position
    [WinstonLog.JobSkippedBotAlreadyHasActivePosition]: {
        name: WinstonLog.JobSkippedBotAlreadyHasActivePosition,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as JobSkippedBotAlreadyHasActivePositionMessage,
    },
    // Job Skipped Bot Not Has Active Position
    [WinstonLog.JobSkippedBotNotHasActivePosition]: {
        name: WinstonLog.JobSkippedBotNotHasActivePosition,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as JobSkippedBotNotHasActivePositionMessage,
    },
    // Job Skipped Bot Not Running
    [WinstonLog.JobSkippedBotNotRunning]: {
        name: WinstonLog.JobSkippedBotNotRunning,
        level: WinstonLevel.Debug,
        loki: true,
        messageType: {
        } as JobSkippedBotNotRunningMessage,
    },
}