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
    OpenPositionTransactionExecutedMessage,
    OpenPositionTransactionFailedMessage,
    PythPricesFetchedMessage,
    PythPricesFetchFailedMessage,
    PythSubscriptionErrorMessage,
    PythSubscriptionResolvedMessage,
    PythSubscriptionsClosedMessage,
    PythSubscriptionsOpenedMessage,
    SwapTransactionExecutedMessage,
    SwapTransactionFailedMessage
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
        level: WinstonLevel.Info,
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
}