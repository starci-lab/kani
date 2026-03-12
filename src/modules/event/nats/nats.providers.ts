import type {
    Provider 
} from "@nestjs/common"
import {
    connect 
} from "nats"
import {
    envConfig 
} from "@modules/env"
import {
    NATS 
} from "./constants"

/**
 * Creates a provider for the NATS connection.
 *
 * @returns Provider that creates and connects to NATS
 *
 * @example
 * Used internally by NatsModule.register().
 */
export const createNatsProvider = (): Provider => ({
    provide: NATS,
    inject: [],
    useFactory: async () => {
        const cfg = envConfig().nats
        return connect({
            servers: cfg.servers,
            reconnect: cfg.reconnect,
            maxReconnectAttempts: cfg.maxReconnectAttempts,
            pingInterval: cfg.pingIntervalMs,
        })
    },
})
