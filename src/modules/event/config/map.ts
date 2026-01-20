import {
    EventName
} from "./enum"
import {
    ClmmLiquidityPoolsSyncedEventPayload, CoordinatorExecutorCreatedEventPayload, CoordinatorExecutorDeletedEventPayload, CoordinatorExecutorUpdatedEventPayload, DlmmLiquidityPoolsSyncedEventPayload, 
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
}