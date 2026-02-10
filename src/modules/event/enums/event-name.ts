/** Event names; each maps to a config entry (useKafka, useLocal, eventPayload type). */
export enum EventName {
    TokenPriceUpdated = "token.price.updated",
    ClmmLiquidityPoolsSynced = "clmm.liquidity.pools.synced",
    DlmmLiquidityPoolsSynced = "dlmm.liquidity.pools.synced",
    ReinitializeBalancers = "reinitialize.balancers",
    CoordinatorExecutorCreated = "coordinator.executor.created",
    CoordinatorExecutorDeleted = "coordinator.executor.deleted",
    CoordinatorExecutorUpdated = "coordinator.executor.updated",
    ExecutorBotUpdated = "executor.bot.updated",
    ExecutorBotCreated = "executor.bot.created",
    ExecutorBotDeleted = "executor.bot.deleted",
    ClmmPositionOpenRequested = "clmm.position.open.requested",
    ClmmPositionOpenWithoutEventRequested = "clmm.position.open.without.event.requested",
    ClmmPositionCloseRequested = "clmm.position.close.requested",
    ClmmPositionCloseWithoutEventRequested = "clmm.position.close.without.event.requested",
    DlmmPositionOpenRequested = "dlmm.position.open.requested",
    DlmmPositionOpenWithoutEventRequested = "dlmm.position.open.without.event.requested",
    DlmmPositionCloseRequested = "dlmm.position.close.requested",
    DlmmPositionCloseWithoutEventRequested = "dlmm.position.close.without.event.requested",
    LockAuthorityTimeout = "lock.authority.timeout",
    LiquidityPoolsBecameReady = "liquidity.pools.became.ready",
    LiquidityPoolsBecameNotReady = "liquidity.pools.became.not.ready"
}
