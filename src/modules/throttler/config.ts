import { ThrottlerOptions } from "@nestjs/throttler"

export enum ThrottlerConfig {
    Soft = "soft",
    Medium = "medium",
    Strict = "strict",
}

export const throttlerConfig: Record<ThrottlerConfig, Array<ThrottlerOptions>> = {
    [ThrottlerConfig.Soft]: [
        // 1 minute — loose limit
        {
            ttl: 60_000,
            limit: 100,
        },
        // 5 minutes — medium-term limit
        {
            ttl: 5 * 60_000,
            limit: 300,
        },
        // 1 hour — long-term total cap
        {
            ttl: 60 * 60_000,
            limit: 1000,
        },
    ],

    [ThrottlerConfig.Medium]: [
        // 1 minute
        {
            ttl: 60_000,
            limit: 30,
        },
        // 5 minutes
        {
            ttl: 5 * 60_000,
            limit: 100,
        },
        // 1 hour
        {
            ttl: 60 * 60_000,
            limit: 300,
        },
    ],

    [ThrottlerConfig.Strict]: [
        // 1 minute — very strict
        {
            ttl: 60_000,
            limit: 10,
        },
        // 5 minutes — tight mid-term control
        {
            ttl: 5 * 60_000,
            limit: 30,
        },
        // 1 hour — strict long-term cap
        {
            ttl: 60 * 60_000,
            limit: 100,
        },
    ],
}