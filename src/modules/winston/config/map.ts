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
    ExecutorMongoDbChangeStreamBotUpdatedMessage
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
        level: WinstonLevel.Info,
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
        level: WinstonLevel.Info,
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
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as DeploymentCreatedMessage,
    },
    // Deployment Deleted
    [WinstonLog.DeploymentDeleted]: {
        name: WinstonLog.DeploymentDeleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as DeploymentDeletedMessage,
    },
    // Deployment Patched
    [WinstonLog.DeploymentPatched]: {
        name: WinstonLog.DeploymentPatched,
        level: WinstonLevel.Info,
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
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as ServiceCreatedMessage,
    },
    // Service Deleted
    [WinstonLog.ServiceDeleted]: {
        name: WinstonLog.ServiceDeleted,
        level: WinstonLevel.Info,
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
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as CoordinatorExecutorsCreatedMessage,
    },
    // Coordinator Executors Deleted
    [WinstonLog.CoordinatorExecutorsDeleted]: {
        name: WinstonLog.CoordinatorExecutorsDeleted,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as CoordinatorExecutorsDeletedMessage,
    },
    // Coordinator Executors Updated
    [WinstonLog.CoordinatorExecutorsUpdated]: {
        name: WinstonLog.CoordinatorExecutorsUpdated,
        level: WinstonLevel.Info,
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
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as ExecutorBotsUpdatedMessage,
    },
    // Executor Bots Created
    [WinstonLog.ExecutorBotsCreated]: {
        name: WinstonLog.ExecutorBotsCreated,
        level: WinstonLevel.Info,
        loki: true,
        messageType: {
        } as ExecutorBotsCreatedMessage,
    },
    // Executor Bots Deleted
    [WinstonLog.ExecutorBotsDeleted]: {
        name: WinstonLog.ExecutorBotsDeleted,
        level: WinstonLevel.Info,
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
}