import {
    EventName,
} from "./enums"
import {
    ConfirmWithdrawalEventPayload,
    KafkaTopicConfig,
    PingEventPayload,
} from "./types"
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
    ReinitializeBalancersEventPayload,
    LockAuthorityTimeoutEventPayload,
    LiquidityPoolsBecameReadyEventPayload,
    LiquidityPoolsBecameNotReadyEventPayload,
    DlmmPositionCloseWithoutEventRequestedEventPayload,
    DlmmPositionOpenWithoutEventRequestedEventPayload,
    ClmmPositionCloseWithoutEventRequestedEventPayload,
    ClmmPositionOpenWithoutEventRequestedEventPayload,
    TokenPriceUpdatedEventPayload,
} from "./types"

/** Map of event names to Kafka/local usage and payload type. */
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
    [EventName.Ping]: {
        useKafka: true,
        useLocal: false,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as PingEventPayload
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
    [EventName.LockAuthorityTimeout]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as LockAuthorityTimeoutEventPayload
    },
    [EventName.LiquidityPoolsBecameReady]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as LiquidityPoolsBecameReadyEventPayload
    },
    [EventName.LiquidityPoolsBecameNotReady]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as LiquidityPoolsBecameNotReadyEventPayload
    },
    [EventName.ClmmPositionOpenWithoutEventRequested]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as ClmmPositionOpenWithoutEventRequestedEventPayload
    },
    [EventName.ClmmPositionCloseWithoutEventRequested]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as ClmmPositionCloseWithoutEventRequestedEventPayload
    },
    [EventName.DlmmPositionOpenWithoutEventRequested]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as DlmmPositionOpenWithoutEventRequestedEventPayload
    },
    [EventName.DlmmPositionCloseWithoutEventRequested]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as DlmmPositionCloseWithoutEventRequestedEventPayload
    },
    [EventName.TokenPriceUpdated]: {
        useKafka: true,
        useLocal: false,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as TokenPriceUpdatedEventPayload
    },
    [EventName.ConfirmWithdrawal]: {
        useKafka: false,
        useLocal: true,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as ConfirmWithdrawalEventPayload
    },
}
