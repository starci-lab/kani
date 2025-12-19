/**
 * DependencyName
 * Centralized list of dependency identifiers used in health checks,
 * monitoring, and observability (Terminus, Prometheus, etc.).
 */
export enum DependencyName {
    /**
     * Redis instance used for application caching
     */
    CacheRedis = "cache-redis",
    /**
     * Redis instance used for adapters / external integrations
     */
    AdapterRedis = "adapter-redis",
    /**
     * Redis instance used by BullMQ for background jobs and queues
     */
    BullmqRedis = "bullmq-redis",
    /**
     * Redis instance used for rate limiting (Throttler)
     */
    ThrottlerRedis = "throttler-redis",
    /**
     * Kafka broker used for event streaming and messaging
     */
    Kafka = "kafka",
    /**
     * Primary MongoDB instance (read/write)
     */
    MongodbPrimary = "mongodb-primary",
    /**
     * Loki service used for log aggregation
     */
    Loki = "loki",
    /**
     * Prometheus service used for metrics collection and monitoring
     */
    Prometheus = "prometheus",
    /**
     * Sentry service used for error tracking and alerting
     */
    Sentry = "sentry",
    /**
     * Disk used for storing data
     */
    Disk = "disk",
    /**
     * Memory used for storing data
     */
    Memory = "memory",
}

/**
 * Health check configuration per external dependency.
 *
 * Each dependency can independently enable:
 * - liveness: Is the dependency still alive during runtime?
 * - readiness: Is the dependency ready to serve requests?
 * - startup:   Is the dependency required for application startup?
 *
 * This configuration is typically used for Kubernetes
 * liveness/readiness/startup probes or internal health endpoints.
 */
export const config: Record<DependencyName, DependencyConfig> = {
    // Kafka: critical for message processing, but should not restart the pod if temporarily down
    [DependencyName.Kafka]: {
        liveness: false,
        readiness: true,
        startup: true,
    },
    // MongoDB: critical for serving requests
    [DependencyName.MongodbPrimary]: {
        liveness: false,
        readiness: true,
        startup: true,
    },
    // Cache Redis: app can still run in degraded mode if cache is unavailable
    [DependencyName.CacheRedis]: {
        liveness: false,
        readiness: true,
        startup: true,
    },
    // Adapter Redis: usually required for core integrations
    [DependencyName.AdapterRedis]: {
        liveness: false,
        readiness: true,
        startup: true,
    },
    // BullMQ Redis: background jobs; API can still serve traffic
    [DependencyName.BullmqRedis]: {
        liveness: false,
        readiness: false,
        startup: false,
    },
    // Throttler Redis: rate limiting; traffic may be allowed without it
    [DependencyName.ThrottlerRedis]: {
        liveness: false,
        readiness: true,
        startup: true,
    },
    // Observability tools should never block app lifecycle
    [DependencyName.Loki]: {
        liveness: false,
        readiness: false,
        startup: false,
    },
    [DependencyName.Prometheus]: {
        liveness: false,
        readiness: false,
        startup: false,
    },
    [DependencyName.Sentry]: {
        liveness: false,
        readiness: false,
        startup: false,
    },
    [DependencyName.Disk]: {
        liveness: false,
        readiness: true,
        startup: true,
    },
    [DependencyName.Memory]: {
        liveness: false,
        readiness: true,
        startup: true,
    },
}

/**
 * Dependency health check toggles.
 */
export interface DependencyConfig {
    /** Checked continuously to determine if the app should be restarted */
    liveness: boolean
    /** Determines whether the app is ready to receive traffic */
    readiness: boolean
    /** Checked only during application startup */
    startup: boolean
}