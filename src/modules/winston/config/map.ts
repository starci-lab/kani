import {
    WinstonLevel
} from "../types"
import {
    WinstonLog
} from "./enum"
import {
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
    OpenPositionEnqueueFailedMessage,
    OpenPositionEnqueuedMessage,
    ClosePositionEnqueuedMessage,
    ClosePositionEnqueueFailedMessage,
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
    ReconcileBalanceEnqueueFailedMessage,
    ReconcileBalanceEnqueuedMessage,
    ReconcileBalanceProcessingStartedMessage,
    ReconcileBalanceProcessingCompletedMessage,
    ReconcileBalanceProcessingFailedPermanentFailureMessage,
    ReconcileBalanceProcessingFailedUnrecoverableMessage,
    ReconcileBalanceProcessingFailedRetryableMessage,
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
    ReconcileBalanceRequeueFailedMessage,
    ReconcileBalanceJobAlreadyPreparedMessage,
    ReconcileBalanceJobAlreadyConfirmedMessage,
    ReconcileBalanceJobAlreadyExecutedMessage,
    OpenPositionJobAlreadyExecutedMessage,
    ClosePositionJobAlreadyPreparedMessage,
    OpenPositionJobAlreadyConfirmedMessage,
    ClosePositionJobAlreadyExecutedMessage,
    ClosePositionJobAlreadyConfirmedMessage,
    OpenPositionJobAlreadyPreparedMessage,
    ClosePositionProcessingFailedUnrecoverableMessage,
    ClosePositionProcessingFailedPermanentFailureMessage,
    ClosePositionProcessingFailedRetryableMessage,
    ClosePositionProcessingCompletedMessage,
    ClosePositionRequeueFailedMessage,
    OpenPositionProcessingFailedUnrecoverableMessage,
    OpenPositionProcessingFailedPermanentFailureMessage,
    OpenPositionProcessingFailedRetryableMessage,
    OpenPositionProcessingCompletedMessage,
    OpenPositionRequeueFailedMessage,
    OpenPositionProcessingStartedMessage,
    DiagnosticsReadyMessage,
    ClosePositionTransactionStimulatedMessage,
    OpenPositionTransactionStimulatedMessage,
    OpenPositionTransactionPreparedMessage,
    ClosePositionTransactionFoundMessage,
    OpenPositionTransactionFoundMessage,
    SwapTransactionFoundMessage,
    ClosePositionBootstrappingFailedMessage,
    OpenPositionBootstrappingFailedMessage,
    ReconcileBalanceBootstrappingFailedMessage,
    OpenPositionJobAlreadyEnqueuedMessage,
    ReconcileBalanceJobAlreadyEnqueuedMessage,
    ClosePositionJobAlreadyEnqueuedMessage,
    CannotSettlePositionMessage
} from "./types"

export const configMap = {

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
    // Close Position Transaction
    [WinstonLog.ClosePositionTransactionExecuted]: {
        name: WinstonLog.ClosePositionTransactionExecuted,
        level: WinstonLevel.Info,
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
        level: WinstonLevel.Info,
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
    // Open Position Enqueued
    [WinstonLog.OpenPositionEnqueued]: {
        name: WinstonLog.OpenPositionEnqueued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionEnqueuedMessage,
    },
    // Open Position Enqueue Failed
    [WinstonLog.OpenPositionEnqueueFailed]: {
        name: WinstonLog.OpenPositionEnqueueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as OpenPositionEnqueueFailedMessage,
    },
    // Close Position Enqueued
    [WinstonLog.ClosePositionEnqueued]: {
        name: WinstonLog.ClosePositionEnqueued,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {  
        } as ClosePositionEnqueuedMessage,
    },
    // Close Position Enqueue Failed
    [WinstonLog.ClosePositionEnqueueFailed]: {
        name: WinstonLog.ClosePositionEnqueueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ClosePositionEnqueueFailedMessage,
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
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as ExecutorMongoDbChangeStreamCloseMessage,
    },
    // Executor Mongo Db Change Stream Started
    [WinstonLog.ExecutorMongoDbChangeStreamStarted]: {
        name: WinstonLog.ExecutorMongoDbChangeStreamStarted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as ExecutorMongoDbChangeStreamStartedMessage,
    },
    // Executor Mongo Db Change Stream Bot Updated
    [WinstonLog.ExecutorMongoDbChangeStreamBotUpdated]: {
        name: WinstonLog.ExecutorMongoDbChangeStreamBotUpdated,
        level: WinstonLevel.Info,
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
    [WinstonLog.ReconcileBalanceEnqueueFailed]: {
        name: WinstonLog.ReconcileBalanceEnqueueFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ReconcileBalanceEnqueueFailedMessage,
    },
    // Reconcile Balance Enqueued
    [WinstonLog.ReconcileBalanceEnqueued]: {
        name: WinstonLog.ReconcileBalanceEnqueued,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as ReconcileBalanceEnqueuedMessage,
    },
    // Reconcile Balance Processing Completed
    [WinstonLog.ReconcileBalanceProcessingCompleted]: {
        name: WinstonLog.ReconcileBalanceProcessingCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as ReconcileBalanceProcessingCompletedMessage,
    },
    // Reconcile Balance Processing Started
    [WinstonLog.ReconcileBalanceProcessingStarted]: {
        name: WinstonLog.ReconcileBalanceProcessingStarted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as ReconcileBalanceProcessingStartedMessage,
    },
    // Reconcile Balance Processing Failed Unrecoverable
    [WinstonLog.ReconcileBalanceProcessingFailedUnrecoverable]: {
        name: WinstonLog.ReconcileBalanceProcessingFailedUnrecoverable,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ReconcileBalanceProcessingFailedUnrecoverableMessage,
    },
    // Reconcile Balance Processing Failed Permanent Failure
    [WinstonLog.ReconcileBalanceProcessingFailedPermanentFailure]: {
        name: WinstonLog.ReconcileBalanceProcessingFailedPermanentFailure,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ReconcileBalanceProcessingFailedPermanentFailureMessage,
    },
    // Reconcile Balance Processing Failed Retryable
    [WinstonLog.ReconcileBalanceProcessingFailedRetryable]: {
        name: WinstonLog.ReconcileBalanceProcessingFailedRetryable,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ReconcileBalanceProcessingFailedRetryableMessage,
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
        level: WinstonLevel.Warn,
        loki: true,
        messageType: {
        } as PriceDiagnosticFailedStaleMessage,
    },
    // Price Diagnostic Failed Not Found
    [WinstonLog.PriceDiagnosticFailedNotFound]: {
        name: WinstonLog.PriceDiagnosticFailedNotFound,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as PriceDiagnosticFailedNotFoundMessage,
    },
    // Dynamic Liquidity Pool Info Diagnostic Failed
    [WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailed]: {
        name: WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailed,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as DynamicLiquidityPoolInfoDiagnosticFailedMessage,
    },
    // Dynamic Liquidity Pool Info Diagnostic Failed Not Found
    [WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedNotFound]: {
        name: WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedNotFound,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as DynamicLiquidityPoolInfoDiagnosticFailedNotFoundMessage,
    },
    // Dynamic Liquidity Pool Info Diagnostic Failed Stale
    [WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedStale]: {
        name: WinstonLog.DynamicLiquidityPoolInfoDiagnosticFailedStale,
        level: WinstonLevel.Warn,
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
    // Close Position Processing Failed Unrecoverable
    [WinstonLog.ClosePositionProcessingFailedUnrecoverable]: {
        name: WinstonLog.ClosePositionProcessingFailedUnrecoverable,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ClosePositionProcessingFailedUnrecoverableMessage,
    },
    // Close Position Processing Failed Permanent Failure
    [WinstonLog.ClosePositionProcessingFailedPermanentFailure]: {
        name: WinstonLog.ClosePositionProcessingFailedPermanentFailure,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ClosePositionProcessingFailedPermanentFailureMessage,
    },
    // Close Position Processing Failed Retryable
    [WinstonLog.ClosePositionProcessingFailedRetryable]: {
        name: WinstonLog.ClosePositionProcessingFailedRetryable,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as ClosePositionProcessingFailedRetryableMessage,
    },
    // Close Position Processing Completed
    [WinstonLog.ClosePositionProcessingCompleted]: {
        name: WinstonLog.ClosePositionProcessingCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as ClosePositionProcessingCompletedMessage,
    },
    // Open Position Processing Failed Unrecoverable
    [WinstonLog.OpenPositionProcessingFailedUnrecoverable]: {
        name: WinstonLog.OpenPositionProcessingFailedUnrecoverable,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as OpenPositionProcessingFailedUnrecoverableMessage,
    },
    // Open Position Processing Failed Permanent Failure
    [WinstonLog.OpenPositionProcessingFailedPermanentFailure]: {
        name: WinstonLog.OpenPositionProcessingFailedPermanentFailure,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as OpenPositionProcessingFailedPermanentFailureMessage,
    },
    // Open Position Processing Failed Retryable
    [WinstonLog.OpenPositionProcessingFailedRetryable]: {
        name: WinstonLog.OpenPositionProcessingFailedRetryable,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as OpenPositionProcessingFailedRetryableMessage,
    },
    // Open Position Processing Completed
    [WinstonLog.OpenPositionProcessingCompleted]: {
        name: WinstonLog.OpenPositionProcessingCompleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as OpenPositionProcessingCompletedMessage,
    },
    // Open Position Processing Started
    [WinstonLog.OpenPositionProcessingStarted]: {
        name: WinstonLog.OpenPositionProcessingStarted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as OpenPositionProcessingStartedMessage,
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
    // Open Position Transaction Prepared
    [WinstonLog.OpenPositionTransactionPrepared]: {
        name: WinstonLog.OpenPositionTransactionPrepared,
        level: WinstonLevel.Verbose,
        loki: true,
        messageType: {
        } as OpenPositionTransactionPreparedMessage,
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
    // Cannot Settle Position
    [WinstonLog.CannotSettlePosition]: {
        name: WinstonLog.CannotSettlePosition,
        level: WinstonLevel.Error,
        loki: true,
        messageType: {
        } as CannotSettlePositionMessage,
    },

}