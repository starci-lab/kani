import {
    EventName
} from "./enum"
import {
    ClmmLiquidityPoolsSyncedEventPayload, 
    ClmmPositionCloseRequestedEventPayload, 
    ClmmPositionOpenRequestedEventPayload, 
    CoordinatorExecutorCreatedEventPayload, 
    CoordinatorExecutorDeletedEventPayload, 
    CoordinatorExecutorUpdatedEventPayload, 
    DlmmLiquidityPoolsSyncedEventPayload, 
    DlmmPositionCloseRequestedEventPayload, 
    DlmmPositionOpenRequestedEventPayload, 
    ExecutorBotCreatedEventPayload, 
    ExecutorBotDeletedEventPayload, 
    ExecutorBotUpdatedEventPayload, 
    ReinitializeBalancersEventPayload
} from "./types"
import {
    KafkaTopicConfig 
} from "../types"

export const configMap = {
    [EventName.ClmmLiquidityPoolsSynced]: {
        useKafka: true,
        useLocal: false,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {    
        } as ClmmLiquidityPoolsSyncedEventPayload
    },
    [EventName.DlmmLiquidityPoolsSynced]: {
        useKafka: true,
        useLocal: false,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as DlmmLiquidityPoolsSyncedEventPayload
    },
    [EventName.ReinitializeBalancers]: {
        useKafka: true,
        useLocal: false,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as ReinitializeBalancersEventPayload
    },
    [EventName.CoordinatorExecutorCreated]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as CoordinatorExecutorCreatedEventPayload
    },
    [EventName.CoordinatorExecutorDeleted]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as CoordinatorExecutorDeletedEventPayload
    },
    [EventName.CoordinatorExecutorUpdated]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as CoordinatorExecutorUpdatedEventPayload
    },
    [EventName.ClmmPositionOpenRequested]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as ClmmPositionOpenRequestedEventPayload
    },
    [EventName.ClmmPositionCloseRequested]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as ClmmPositionCloseRequestedEventPayload
    },
    [EventName.DlmmPositionOpenRequested]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as DlmmPositionOpenRequestedEventPayload
    },
    [EventName.DlmmPositionCloseRequested]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as DlmmPositionCloseRequestedEventPayload
    },
    [EventName.ExecutorBotUpdated]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as ExecutorBotUpdatedEventPayload
    },
    [EventName.ExecutorBotCreated]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as ExecutorBotCreatedEventPayload
    },
    [EventName.ExecutorBotDeleted]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as ExecutorBotDeletedEventPayload
    },
}