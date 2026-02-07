/** Params for acquiring lock authority for a bot. */
export interface AcquireParams {
    botId: string
}

/** Params for releasing lock authority for a bot. */
export interface ReleaseParams {
    botId: string
}

/** Params for sending heartbeat to refresh lock authority. */
export interface SendHeartbeatParams {
    botId: string
}
