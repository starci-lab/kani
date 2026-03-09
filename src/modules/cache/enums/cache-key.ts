/**
 * Enum of cache key names used for Redis/memory cache entries.
 * Each key corresponds to a cache namespace and its result type.
 */
export enum CacheKey {
    ActivePriceCex = "active.price.cex",
    ActiveVolumeCex = "active.volume.cex",
    CexTokenPriceUpdated = "cex.token.price.updated",
    CexTokenVolumeUpdated = "cex.token.volume.updated",
    RotationBotAssignments = "rotation.bot.assignments",
    Withdraw = "withdraw",
    SendOtpCode = "send.otp.code",
    AggregatedTokenPrice = "aggregated.token.price",
    AggregatedTokenPriceTwap = "aggregated.token.price.twap",
    DynamicClmmLiquidityPoolInfo = "dynamic.clmm.liquidity.pool.info",
    DynamicDlmmLiquidityPoolInfo = "dynamic.dlmm.liquidity.pool.info",
    PoolAnalytics = "pool.analytics",
    SessionId = "session.id",
    LiquidityPoolsSyncedDiagnosticReadiness = "liquidity.pools.synced.diagnostic.readiness",
    KafkaMessageDigest = "kafka.message.digest",
}
