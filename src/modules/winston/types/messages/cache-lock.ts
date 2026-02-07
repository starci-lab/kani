export interface ErrorGettingCacheMessage {
    cacheKey: string
    error: string
    cacheType: string
}

export interface ErrorSettingCacheMessage {
    cacheKey: string
    error: string
    cacheType: string
}

export interface ErrorDeletingCacheMessage {
    cacheKey: string
    error: string
    cacheType: string
}

export interface CacheDebugOkRedisMessage {
    randomString: string
}

export interface CacheDebugOkMemoryMessage {
    randomString: string
}

export interface LockAuthorityNotifyExpiredLocksFailedMessage {
    error: string
}

export interface LockAuthorityAcquiredMessage {
    botId: string
    key: string
}

export interface LockAuthorityAcquireFailedMessage {
    botId: string
    key: string
    lockSchedulerKey: string
    error: string
}

export interface LockAuthorityReleaseFailedMessage {
    botId: string
    key: string
    lockSchedulerKey: string
    error: string
}

export interface LockAuthoritySendHeartbeatFailedMessage {
    botId: string
    key: string
    lockSchedulerKey: string
    error: string
}

export interface ReconcileBalanceLockAuthorityReleasedMessage {
    botId: string
}

export interface OpenPositionLockAuthorityReleasedMessage {
    botId: string
}

export interface ClosePositionLockAuthorityReleasedMessage {
    botId: string
}

export interface WithdrawLockAuthorityReleasedMessage {
    botId: string
}
