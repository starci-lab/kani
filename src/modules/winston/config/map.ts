import {
    WinstonLevel
} from "../types"
import {
    WinstonLog
} from "./enum"
import {
    ClosePositionTransactionExecutedMessage,
    ClosePositionTransactionFailedMessage,
    GoogleDriveFileDownloadedMessage,
    GoogleDriveFileDownloadErrorMessage,
    GoogleDriveFileUploadedMessage,
    LiquidityPoolFetchedErrorMessage,
    LiquidityPoolWsErrorMessage,
    OpenPositionTransactionExecutedMessage,
    OpenPositionTransactionFailedMessage,
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
}