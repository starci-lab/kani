import {
    EventName,
} from "./enums"
import {
    ConfirmWithdrawalEventPayload,
    EventSubjectConfig,
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

/** Map of event names to NATS/local usage and payload type. */
export const configMap = {
    [EventName.ClmmLiquidityPoolsSynced]: {
        useNats: true,
        useLocal: false,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as ClmmLiquidityPoolsSyncedEventPayload
    },
    [EventName.DlmmLiquidityPoolsSynced]: {
        useNats: true,
        useLocal: false,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as DlmmLiquidityPoolsSyncedEventPayload
    },
    [EventName.ReinitializeBalancers]: {
        useNats: true,
        useLocal: false,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as ReinitializeBalancersEventPayload
    },
    [EventName.Ping]: {
        useNats: true,
        useLocal: false,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as PingEventPayload
    },
    [EventName.CoordinatorExecutorCreated]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as CoordinatorExecutorCreatedEventPayload
    },
    [EventName.CoordinatorExecutorDeleted]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as CoordinatorExecutorDeletedEventPayload
    },
    [EventName.CoordinatorExecutorUpdated]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as CoordinatorExecutorUpdatedEventPayload
    },
    [EventName.ClmmPositionOpenRequested]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as ClmmPositionOpenRequestedEventPayload
    },
    [EventName.ClmmPositionCloseRequested]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as ClmmPositionCloseRequestedEventPayload
    },
    [EventName.DlmmPositionOpenRequested]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as DlmmPositionOpenRequestedEventPayload
    },
    [EventName.DlmmPositionCloseRequested]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as DlmmPositionCloseRequestedEventPayload
    },
    [EventName.ExecutorBotUpdated]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as ExecutorBotUpdatedEventPayload
    },
    [EventName.ExecutorBotCreated]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as ExecutorBotCreatedEventPayload
    },
    [EventName.ExecutorBotDeleted]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as ExecutorBotDeletedEventPayload
    },
    [EventName.LockAuthorityTimeout]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as LockAuthorityTimeoutEventPayload
    },
    [EventName.LiquidityPoolsBecameReady]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as LiquidityPoolsBecameReadyEventPayload
    },
    [EventName.LiquidityPoolsBecameNotReady]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as LiquidityPoolsBecameNotReadyEventPayload
    },
    [EventName.ClmmPositionOpenWithoutEventRequested]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as ClmmPositionOpenWithoutEventRequestedEventPayload
    },
    [EventName.ClmmPositionCloseWithoutEventRequested]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as ClmmPositionCloseWithoutEventRequestedEventPayload
    },
    [EventName.DlmmPositionOpenWithoutEventRequested]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as DlmmPositionOpenWithoutEventRequestedEventPayload
    },
    [EventName.DlmmPositionCloseWithoutEventRequested]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as DlmmPositionCloseWithoutEventRequestedEventPayload
    },
    [EventName.TokenPriceUpdated]: {
        useNats: true,
        useLocal: false,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as TokenPriceUpdatedEventPayload
    },
    [EventName.ConfirmWithdrawal]: {
        useNats: false,
        useLocal: true,
        config: {
        } as Partial<EventSubjectConfig>,
        eventPayload: {
        } as ConfirmWithdrawalEventPayload
    },
}
