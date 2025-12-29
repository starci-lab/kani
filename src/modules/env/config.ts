import { join } from "path"
import ms from "ms"
import Decimal from "decimal.js"
import bytes from "bytes"

export enum K8SRecreateStrategy {
    Never = "never",
    Patch = "patch",
    Recreate = "recreate",
}

export const envConfig = () => ({
    isProduction: process.env.NODE_ENV === "production",
    port: {
        core: Number(process.env.CORE_PORT) || 3010,
    },
    bounds: {
        solana: {
            swap: {
                lowerBound: parseFloat(process.env.SOLANA_SWAP_LOWER_BOUND || "0.95"),
            },
            openPosition: {
                lowerBound: parseFloat(process.env.SOLANA_OPEN_POSITION_LOWER_BOUND || "0.95"),
                upperBound: parseFloat(process.env.SOLANA_OPEN_POSITION_UPPER_BOUND || "1.05"),
            }
        },
        sui: {
            swap: {
                lowerBound: parseFloat(process.env.SUI_SWAP_LOWER_BOUND || "0.95"),
            },
            openPosition: {
                lowerBound: parseFloat(process.env.SUI_OPEN_POSITION_LOWER_BOUND || "0.95"),
                upperBound: parseFloat(process.env.SUI_OPEN_POSITION_UPPER_BOUND || "1.05"),
            }
        },
    },
    slippage: {
        openPosition: parseFloat(process.env.SLIPPAGE_OPEN_POSITION || "0.5"),
        closePosition: parseFloat(process.env.SLIPPAGE_CLOSE_POSITION || "0.9999"),
        swap: parseFloat(process.env.SLIPPAGE_SWAP || "0.9999"),
    },
    kubernetes: {
        podNamespace: process.env.POD_NAMESPACE || "default",
    },
    k8s: {
        kaniExecutor: {
            recreate: (process.env.KANI_EXECUTOR_RECREATE_STRATEGY || K8SRecreateStrategy.Recreate) as K8SRecreateStrategy,
            probes: {
                liveness: {
                    failureThreshold: parseInt(process.env.KANI_EXECUTOR_PROBES_LIVENESS_FAILURE_THRESHOLD || "3", 10),
                    httpGet: {
                        path: process.env.KANI_EXECUTOR_PROBES_LIVENESS_PATH || "/api/terminus/liveness",
                        port: process.env.KANI_EXECUTOR_PROBES_LIVENESS_PORT || "app",
                        scheme: process.env.KANI_EXECUTOR_PROBES_LIVENESS_SCHEME || "HTTP",
                    },
                    initialDelaySeconds: parseInt(process.env.KANI_EXECUTOR_PROBES_LIVENESS_INITIAL_DELAY_SECONDS || "30", 10),
                    periodSeconds: parseInt(process.env.KANI_EXECUTOR_PROBES_LIVENESS_PERIOD_SECONDS || "10", 10),
                    successThreshold: parseInt(process.env.KANI_EXECUTOR_PROBES_LIVENESS_SUCCESS_THRESHOLD || "1", 10),
                    timeoutSeconds: parseInt(process.env.KANI_EXECUTOR_PROBES_LIVENESS_TIMEOUT_SECONDS || "5", 10),
                },
                readiness: {
                    failureThreshold: parseInt(process.env.KANI_EXECUTOR_PROBES_READINESS_FAILURE_THRESHOLD || "3", 10),
                    httpGet: {
                        path: process.env.KANI_EXECUTOR_PROBES_READINESS_PATH || "/api/terminus/readiness",
                        port: process.env.KANI_EXECUTOR_PROBES_READINESS_PORT || "app",
                        scheme: process.env.KANI_EXECUTOR_PROBES_READINESS_SCHEME || "HTTP",
                    },
                    initialDelaySeconds: parseInt(process.env.KANI_EXECUTOR_PROBES_READINESS_INITIAL_DELAY_SECONDS || "30", 10),
                    periodSeconds: parseInt(process.env.KANI_EXECUTOR_PROBES_READINESS_PERIOD_SECONDS || "10", 10),
                    successThreshold: parseInt(process.env.KANI_EXECUTOR_PROBES_READINESS_SUCCESS_THRESHOLD || "1", 10),
                    timeoutSeconds: parseInt(process.env.KANI_EXECUTOR_PROBES_READINESS_TIMEOUT_SECONDS || "5", 10),
                },
                startup: {
                    failureThreshold: parseInt(process.env.KANI_EXECUTOR_PROBES_STARTUP_FAILURE_THRESHOLD || "3", 10),
                    httpGet: {
                        path: process.env.KANI_EXECUTOR_PROBES_STARTUP_PATH || "/api/terminus/startup",
                        port: process.env.KANI_EXECUTOR_PROBES_STARTUP_PORT || "app",
                        scheme: process.env.KANI_EXECUTOR_PROBES_STARTUP_SCHEME || "HTTP",
                    },
                    initialDelaySeconds: parseInt(process.env.KANI_EXECUTOR_PROBES_STARTUP_INITIAL_DELAY_SECONDS || "30", 10),
                    periodSeconds: parseInt(process.env.KANI_EXECUTOR_PROBES_STARTUP_PERIOD_SECONDS || "10", 10),
                    successThreshold: parseInt(process.env.KANI_EXECUTOR_PROBES_STARTUP_SUCCESS_THRESHOLD || "1", 10),
                    timeoutSeconds: parseInt(process.env.KANI_EXECUTOR_PROBES_STARTUP_TIMEOUT_SECONDS || "5", 10),
                }
            },
            image: process.env.KANI_EXECUTOR_IMAGE || "nginx:alpine",
            replicas: parseInt(process.env.KANI_EXECUTOR_REPLICAS || "1", 10),
            envVarsConfigMapName: process.env.KANI_EXECUTOR_ENV_VARS_CONFIG_MAP_NAME || "kani-executor-service-env-vars",
            envVarsSecretName: process.env.KANI_EXECUTOR_ENV_VARS_SECRET_NAME || "kani-executor-service-env-vars",
            resources: {
                limits: {
                    cpu: process.env.KANI_EXECUTOR_RESOURCES_LIMITS_CPU || "512m",
                    memory: process.env.KANI_EXECUTOR_RESOURCES_LIMITS_MEMORY || "1Gi",
                },
                requests: {
                    cpu: process.env.KANI_EXECUTOR_RESOURCES_REQUESTS_CPU || "64m",
                    memory: process.env.KANI_EXECUTOR_RESOURCES_REQUESTS_MEMORY || "128Mi",
                },
            },
            nodePool: process.env.KANI_EXECUTOR_NODE_POOL || "kani-primary-node-pool",
        },
    },
    totp: {
        logo: process.env.TOTP_LOGO || "https://scontent.fsgn8-4.fna.fbcdn.net/v/t39.30808-1/534136898_749293854666581_1584213272352607870_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=1d2534&_nc_eui2=AeFqh_r3g1VaKKx2wFccqASXzBUDs9FLWU_MFQOz0UtZT0Pflcmod5znN1RtZH6geE4rZxAs1W7G0U1ZjE0oRwUb&_nc_ohc=HZoHHQaSGX0Q7kNvwFfrVZq&_nc_oc=Adk2goBox0pzD9vSz44dUTtPLaDeFbqBwz4c5LW3gaIyi5a8zCQvMSsKPV_0n2FR_q0&_nc_zt=24&_nc_ht=scontent.fsgn8-4.fna&_nc_gid=v9zPPrhoxGVDOHOHmPQtdw&oh=00_Afbr9TMLXtHZ_BxLmnjH1AVQeq3Q4QJCq5Wtsan6LC5tqg&oe=68DF1667",
        color: process.env.TOTP_COLOR || "#4267b2",
        backgroundColor: process.env.TOTP_BACKGROUND_COLOR || "#e9ebee",
    },
    sentry: {
        dsn: process.env.SENTRY_DSN || "https://4b08d10ac2853aaf7c60950ad2eb6114@o4510097305042944.ingest.de.sentry.io/4510097307074640",
        version: process.env.VERSION || "0.0.1",
    },
    intervalLimits: {
        history: parseInt(process.env.INTERVAL_LIMITS_HISTORY_LIMIT || "1000", 10),
    },
    redis: {
        cache: {
            host: process.env.REDIS_CACHE_HOST || "localhost",
            port: parseInt(process.env.REDIS_CACHE_PORT || "6379", 10),
            password: process.env.REDIS_CACHE_PASSWORD || "Cuong123_A",
            ttl: parseInt(process.env.CACHE_CACHE_REDIS_TTL || "3600000", 10), // 3600s
            useCluster: Boolean(process.env.REDIS_CACHE_USE_CLUSTER) || false,
        },
        adapter: {
            host: process.env.REDIS_ADAPTER_HOST || "localhost",
            port: parseInt(process.env.REDIS_ADAPTER_PORT || "6379", 10),
            password: process.env.REDIS_ADAPTER_PASSWORD || "Cuong123_A",
            useCluster: Boolean(process.env.REDIS_ADAPTER_USE_CLUSTER) || false,
        },
        bullmq: {
            host: process.env.REDIS_BULLMQ_HOST || "localhost",
            port: parseInt(process.env.REDIS_BULLMQ_PORT || "6379", 10),
            password: process.env.REDIS_BULLMQ_PASSWORD || "Cuong123_A",
            useCluster: Boolean(process.env.REDIS_BULLMQ_USE_CLUSTER) || false,
        },
        throttler: {
            host: process.env.REDIS_THROTTLER_HOST || "localhost",
            port: parseInt(process.env.REDIS_THROTTLER_PORT || "6379", 10),
            password: process.env.REDIS_THROTTLER_PASSWORD || "Cuong123_A",
            useCluster: Boolean(process.env.REDIS_THROTTLER_USE_CLUSTER) || false,
            ttl: parseInt(process.env.THROTTLER_REDIS_TTL || "3600000", 10), // 3600s
        },
        lock: {
            host: process.env.REDIS_LOCK_HOST || "localhost",
            port: parseInt(process.env.REDIS_LOCK_PORT || "6379", 10),
            password: process.env.REDIS_LOCK_PASSWORD || "Cuong123_A",
            useCluster: Boolean(process.env.REDIS_LOCK_USE_CLUSTER) || false,
            ttl: parseInt(process.env.LOCK_REDIS_TTL || "3600000", 10), // 3600s
        },
    },
    cache: {
        memoryTtl: parseInt(process.env.CACHE_MEMORY_TTL || "3600000", 10), // 3600s
        redisTtl: parseInt(process.env.CACHE_REDIS_TTL || "3600000", 10), // 3600s
        ttl: {
            poolAnalytics: parseInt(process.env.CACHE_POOL_ANALYTICS_TTL || ms("1d").toString(), 10), // 1 day
            poolState: parseInt(process.env.CACHE_POOL_STATE_TTL || ms("1m").toString(), 10), // 60s
            pythTokenPrice: parseInt(process.env.CACHE_PYTH_TOKEN_PRICE_TTL || ms("1m").toString(), 10), // 60s
            api: parseInt(process.env.CACHE_API_TTL || ms("1m").toString(), 10), // 60s
            spotPrice: parseInt(process.env.CACHE_SPOT_PRICE_TTL || ms("1m").toString(), 10), // 60s
        }
    }, 
    ejection: {
        rpcTtl: parseInt(process.env.EJECTION_RPC_TTL || ms("1d").toString(), 10), // 1 day
    },
    resources: {
        ram: {
            threadhold: parseInt(process.env.RAM_ALLOCATION_THRESHOLD || new Decimal(250).mul(1024).mul(1024).mul(1024).toString(), 10),
        },
        disk: {
            threadholdPercent: new Decimal(process.env.DISK_ALLOCATION_THRESHOLD || "0.8").toNumber(),
        },
    },
    databases: {
        mongoose: {
            primary: {
                host: process.env.PRIMARY_MONGO_DB_HOST || "localhost",
                port: parseInt(process.env.PRIMARY_MONGO_DB_PORT || "27018", 10),
                password: process.env.PRIMARY_MONGO_DB_PASSWORD || "Cuong123_A",
                username: process.env.PRIMARY_MONGO_DB_USERNAME || "root",
                dbName: process.env.PRIMARY_MONGO_DB_NAME || "cicore",
            },
        },
    },
    salt: {
        jwt: process.env.JWT_SALT || "ZsOM7sCx0UemrdC3gsi2q6NRQLb7TCsI",
        aesCbc: process.env.AES_CBC_SALT || "ZsOM7sCx0UemrdC3gsi2q6NRQLb7TCsI",
    },
    loki: {
        host: process.env.LOKI_HOST || "http://localhost:3100",
        requireAuth: Boolean(process.env.LOKI_REQUIRE_AUTH) || false,
        username: process.env.LOKI_USERNAME,
        password: process.env.LOKI_PASSWORD,
    },
    jwt: {
        accessToken: {
            expiration: (process.env.JWT_ACCESS_TOKEN_EXPIRATION || "1d") as ms.StringValue,
        },
        refreshToken: {
            expiration: (process.env.JWT_REFRESH_TOKEN_EXPIRATION || "7d") as ms.StringValue,
        },
    },
    mountPath: {
        gcp: {
            cryptoKeyEdSa: process.env.GCP_CRYPTO_KEY_ED_SA_MOUNT_PATH || join(process.cwd(), ".mount", "gcp", "crypto-key-ed-sa.json"),
        },
        keys: {
            aes: process.env.AES_MOUNT_PATH || join(process.cwd(), ".mount", "keys", "aes.key"),
            jwtSecret: process.env.JWT_SECRET_MOUNT_PATH || join(process.cwd(), ".mount", "keys", "jwt-secret.key"),
        },
        config: {
            smtp: process.env.SMTP_MOUNT_PATH || join(process.cwd(), ".mount", "config", "smtp.json"),
            rpcs: process.env.RPCS_MOUNT_PATH || join(process.cwd(), ".mount", "config", "rpcs.json"),
            apiKeys: process.env.API_KEYS_MOUNT_PATH || join(process.cwd(), ".mount", "config", "api-keys.json"),
        },
    },
    timeConfig: {
        retry: {
            maxRetries: parseInt(process.env.TIME_CONFIG_RETRY_MAX_RETRIES || "3", 10), // 3 retries for each RPC call
            delay: parseInt(process.env.TIME_CONFIG_RETRY_DELAY || "1000", 10), // 1s delay between retries
            maxDelay: parseInt(process.env.TIME_CONFIG_RETRY_MAX_DELAY || "30000", 10), // 30s max delay
            factor: parseFloat(process.env.TIME_CONFIG_RETRY_FACTOR || "2.0"), // 2x exponential backoff
        },
        wsTimeout: parseInt(process.env.TIME_CONFIG_WS_TIMEOUT || "10000", 10), // 10s
        lockCooldown: {
            openPosition: parseInt(process.env.LOCK_COOLDOWN_OPEN_POSITION || "10000", 10), // 10s
            closePosition: parseInt(process.env.LOCK_COOLDOWN_CLOSE_POSITION || "10000", 10), // 10s
            rebalancing: parseInt(process.env.LOCK_COOLDOWN_REBALANCING || "5000", 10), // 5s
        },
        interval: {
            mutex: parseInt(process.env.INTERVAL_MUTEX || ms("30m").toString(), 10), // 30 minutes
            activeBot: parseInt(process.env.INTERVAL_ACTIVE_BOT_INTERVAL || ms("10s").toString(), 10), // 10s
            rebalancing: parseInt(process.env.INTERVAL_REBALANCING || ms("10s").toString(), 10), // 10 seconds
            poolStateUpdate: parseInt(process.env.INTERVAL_POOL_STATE_UPDATE || ms("10s").toString(), 10), // 10s
            suiPoolStateUpdate: parseInt(process.env.INTERVAL_SUI_POOL_STATE_UPDATE || ms("1s").toString(), 10), // 1s
            analytics: parseInt(process.env.INTERVAL_ANALYTICS || ms("30s").toString(), 10), // 30s
            balanceSnapshot: parseInt(process.env.INTERVAL_BALANCE_SNAPSHOT || ms("30s").toString(), 10), // 30s
        },
    },
    bullmq: {
        attempts: parseInt(process.env.BULLMQ_ATTEMPTS || "5", 10),
        delay: parseInt(process.env.BULLMQ_DELAY || "200", 10),
        concurrency: parseInt(process.env.BULLMQ_CONCURRENCY || "1000", 10),
        batchSize: parseInt(process.env.BULLMQ_BATCH_SIZE || "1000", 10),
        lockDuration: parseInt(process.env.BULLMQ_LOCK_DURATION || "10000", 10),
        completedJobCount: parseInt(process.env.BULLMQ_COMPLETED_JOB_COUNT || "1000", 10),
        failedJobCount: parseInt(process.env.BULLMQ_FAILED_JOB_COUNT || "1000", 10),
    },
    cors: {
        origins: Array.from({ length: 10 }, (_, i) =>
            process.env[`CORS_ORIGIN_${i + 1}`] || ""
        ).filter((url) => url !== ""),
    },
    kafka: {
        maxInFlightRequests: parseInt(process.env.KAFKA_MAX_IN_FLIGHT_REQUESTS || "5", 10), // 5 requests
        metadataStabilizationDelayMs: parseInt(process.env.KAFKA_METADATA_STABILIZATION_DELAY_MS || ms("1s").toString(), 10), // 1 second
        kafkaTopicPollIntervalMs: parseInt(process.env.KAFKA_TOPIC_POLL_INTERVAL_MS || ms("500ms").toString(), 10), // 500 milliseconds
        kafkaTopicPollTimeoutMs: parseInt(process.env.KAFKA_TOPIC_POLL_TIMEOUT_MS || ms("10s").toString(), 10), // 10 seconds
        resetTopics: Boolean(process.env.KAFKA_RESET_TOPICS) || false,
        heartbeatInterval: parseInt(process.env.KAFKA_HEARTBEAT_INTERVAL || ms("3s").toString(), 10), // 3 seconds
        retry: {
            retries: parseInt(process.env.KAFKA_RETRY_RETRIES || "10", 10), // 10 retries
            restartOnFailure: Boolean(process.env.KAFKA_RETRY_RESTART_ON_FAILURE) || true,
            factor: parseFloat(process.env.KAFKA_RETRY_FACTOR || "2.0"), // 2x exponential backoff
        },
        numPartitions: parseInt(process.env.KAFKA_NUM_PARTITIONS || "3", 10),
        replicationFactor: parseInt(process.env.KAFKA_REPLICATION_FACTOR || "1", 10),
        retentionMs: parseInt(process.env.KAFKA_RETENTION_MS || ms("1s").toString(), 10), // 1 second
        cleanupPolicy: process.env.KAFKA_CLEANUP_POLICY || "delete",
        segmentMs: parseInt(process.env.KAFKA_SEGMENT_MS || "1000", 10), // 1 second
        segmentBytes: parseInt(process.env.KAFKA_SEGMENT_BYTES || bytes("1KB"), 10), // 1 MB
        maxMessageBytes: parseInt(process.env.KAFKA_MAX_MESSAGE_BYTES || bytes("1KB"), 10), // 1 MB
        fileDeleteDelayMs: parseInt(process.env.KAFKA_FILE_DELETE_DELAY_MS || ms("1s").toString(), 10), // 1 second
        host: process.env.KAFKA_BROKER_HOST || "localhost",
        port: parseInt(process.env.KAFKA_BROKER_PORT || "9092", 10),
        sasl: {
            enabled: Boolean(process.env.KAFKA_SASL_ENABLED) || false,
            username: process.env.KAFKA_SASL_USERNAME || "",
            password: process.env.KAFKA_SASL_PASSWORD || "",
        },
    },
    pyth: {
        sui: {
            endpoint: process.env.SUI_PYTH_ENDPOINT || "https://hermes.pyth.network",
        },
        solana: {
            endpoint: process.env.SOLANA_PYTH_ENDPOINT || "https://hermes-beta.pyth.network",
        },
    },
    capacity: {
        executor: {
            maxUsers: process.env.CAPACITY_EXECUTOR_MAX_USERS ? parseInt(process.env.CAPACITY_EXECUTOR_MAX_USERS, 10) : 1000,
        },
    },
    botExecutor: {
        executorId: process.env.BOT_EXECUTOR_ID || "694900f2e951fd6ca285945c",
    },
    ports: {
        kaniInterface: process.env.KANI_INTERFACE_PORT ? parseInt(process.env.KANI_INTERFACE_PORT, 10) : 3001,
        kaniCoordinator: process.env.KANI_COORDINATOR_PORT ? parseInt(process.env.KANI_COORDINATOR_PORT, 10) : 3002,
        kaniExecutor: process.env.KANI_EXECUTOR_PORT ? parseInt(process.env.KANI_EXECUTOR_PORT, 10) : 3003,
        botCoordinator: process.env.BOT_COORDINATOR_PORT ? parseInt(process.env.BOT_COORDINATOR_PORT, 10) : 3002,
        botExecutor: process.env.BOT_EXECUTOR_PORT ? parseInt(process.env.BOT_EXECUTOR_PORT, 10) : 3004,
        kaniObserver: process.env.KANI_OBSERVER_PORT ? parseInt(process.env.KANI_OBSERVER_PORT, 10) : 3005,
    },
})
