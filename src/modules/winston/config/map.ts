import {
    WinstonLevel
} from "../types"
import {
    WinstonLog
} from "./enum"
import {
    ClosePositionTransactionExecutedMessage,
    ClosePositionTransactionFailedMessage,
    LiquidityPoolFetchedErrorMessage,
    OpenPositionTransactionExecutedMessage,
    OpenPositionTransactionFailedMessage
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
}