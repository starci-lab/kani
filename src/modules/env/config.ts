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
    slippage: {
        openPosition: {
            liquidtyAdjustment: parseFloat(
                process.env.SLIPPAGE_OPEN_POSITION_LIQUIDTY_ADJUSTMENT || "0.005"
            ),
            amountBounds: parseFloat(
                process.env.SLIPPAGE_OPEN_POSITION_AMOUNT_BOUNDS || "0.05"
            ),
        },
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
    pagination: {
        bots: {
            limit: {
                default: parseInt(process.env.PAGINATION_BOTS2_LIMIT_DEFAULT || "10", 10),
                min: parseInt(process.env.PAGINATION_BOTS2_LIMIT_MIN || "1", 10),
                max: parseInt(process.env.PAGINATION_BOTS2_LIMIT_MAX || "20", 10),
            },
            pageNumber: {
                default: parseInt(process.env.PAGINATION_BOTS_PAGE_NUMBER_DEFAULT || "1", 10),
                max: parseInt(process.env.PAGINATION_BOTS_PAGE_NUMBER_MAX || "100", 100),
            },
        },
        positions: {
            limit: {
                default: parseInt(process.env.PAGINATION_POSITIONS_LIMIT_DEFAULT || "10", 10),
                min: parseInt(process.env.PAGINATION_POSITIONS_LIMIT_MIN || "1", 10),
                max: parseInt(process.env.PAGINATION_POSITIONS_LIMIT_MAX || "20", 10),
            },
            pageNumber: {
                default: parseInt(process.env.PAGINATION_POSITIONS_PAGE_NUMBER_DEFAULT || "1", 10),
                max: parseInt(process.env.PAGINATION_POSITIONS_PAGE_NUMBER_MAX || "100", 100),
            },
        },
        transactions: {
            limit: {
                default: parseInt(process.env.PAGINATION_TRANSACTIONS2_LIMIT_DEFAULT || "10", 10),
                min: parseInt(process.env.PAGINATION_TRANSACTIONS2_LIMIT_MIN || "1", 10),
                max: parseInt(process.env.PAGINATION_TRANSACTIONS2_LIMIT_MAX || "20", 10),
            },
            pageNumber: {
                default: parseInt(process.env.PAGINATION_TRANSACTIONS_PAGE_NUMBER_DEFAULT || "1", 10),
                max: parseInt(process.env.PAGINATION_TRANSACTIONS_PAGE_NUMBER_MAX || "100", 100),
            },
        },
        liquidityPools: {
            limit: {
                default: parseInt(process.env.PAGINATION_LIQUIDITY_POOLS_LIMIT_DEFAULT || "10", 10),
                min: parseInt(process.env.PAGINATION_LIQUIDITY_POOLS_LIMIT_MIN || "1", 10),
                max: parseInt(process.env.PAGINATION_LIQUIDITY_POOLS_LIMIT_MAX || "20", 10),
            },
            pageNumber: {
                default: parseInt(process.env.PAGINATION_LIQUIDITY_POOLS_PAGE_NUMBER_DEFAULT || "1", 10),
                max: parseInt(process.env.PAGINATION_LIQUIDITY_POOLS_PAGE_NUMBER_MAX || "100", 100),
            },
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
        ttl: {
            spotPrice: parseInt(process.env.CACHE_SPOT_PRICE_TTL || ms("1m").toString(), 10), // 1 minute
            sealedJwtSecretKey: parseInt(process.env.CACHE_SEALED_JWT_SECRET_KEY_TTL || ms("5m").toString(), 10), // 5 mins
            sealedAesKey: parseInt(process.env.CACHE_SEALED_AES_KEY_TTL || ms("5m").toString(), 10), // 5 mins
            poolAnalytics: parseInt(process.env.CACHE_POOL_ANALYTICS_TTL || ms("1d").toString(), 10), // 1 day
            poolState: parseInt(process.env.CACHE_POOL_STATE_TTL || "0", 10), // never expire
            pythPrice: parseInt(process.env.CACHE_POOL_STATE_TTL || "0", 10), // never expire
            api: parseInt(process.env.CACHE_API_TTL || ms("1m").toString(), 10), // 60s
            responses: {
                fees: parseInt(process.env.CACHE_RESPONSES_FEES_TTL || ms("5m").toString(), 10), // 5 minutes
            }
        },
        stale: {
            priceMaxAgeMs: parseInt(process.env.CACHE_STALE_PRICE_MAX_AGE_MS || ms("10s").toString(), 10), // 10s
        }
    }, 
    diagnostics: {
        pythPrice: {
            maxRetries: parseInt(process.env.DIAGNOSTICS_PYTH_PRICE_MAX_RETRIES || "10", 10),
            delayMs: parseInt(process.env.DIAGNOSTICS_PYTH_PRICE_DELAY_MS || "1000", 10),
        },
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
    genPath: {
        keys: process.env.GEN_PATH_KEYS || join(process.cwd(), ".gen", "keys"),
    },
    mountPath: {
        data: {
            restore: process.env.DATA_RESTORE_MOUNT_PATH || join(process.cwd(), ".mount", "data", "restore"),
            backup: process.env.DATA_BACKUP_MOUNT_PATH || join(process.cwd(), ".mount", "data", "backup"),
        },
        terraform: {
            encryptedAesKey: process.env.TERRAFORM_ENCRYPTED_AES_KEY_MOUNT_PATH || join(process.cwd(), ".mount", "terraform", "encrypted-aes.key"),
            encryptedJwtSecretKey: process.env.TERRAFORM_ENCRYPTED_JWT_SECRET_KEY_MOUNT_PATH || join(process.cwd(), ".mount", "terraform", "encrypted-jwt-secret.key"),
            gcpCryptoKeyEdSa: process.env.TERRAFORM_GCP_CRYPTO_KEY_ED_SA_MOUNT_PATH || join(process.cwd(), ".mount", "terraform", "gcp-crypto-key-ed-sa.json"),
            gcpGoogleDriveUdSa: process.env.TERRAFORM_GCP_GOOGLE_DRIVE_UD_SA_MOUNT_PATH || join(process.cwd(), ".mount", "terraform", "gcp-google-drive-ud-sa.json"),
            gcpCloudKmsCryptoOperatorSa: process.env.TERRAFORM_GCP_CLOUD_KMS_CRYPTO_OPERATOR_SA_MOUNT_PATH || join(process.cwd(), ".mount", "terraform", "gcp-cloud-kms-crypto-operator-sa.json"),
            privyAppSecretKey: process.env.TERRAFORM_PRIVY_APP_SECRET_KEY_MOUNT_PATH || join(process.cwd(), ".mount", "terraform", "privy-app-secret.key"),
            privySignerPrivateKey: process.env.TERRAFORM_PRIVY_SIGNER_PRIVATE_KEY_MOUNT_PATH || join(process.cwd(), ".mount", "terraform", "privy-signer-private-key.key"),
        },
        config: {
            app: process.env.CONFIG_APP_MOUNT_PATH || join(process.cwd(), ".mount", "config", "app.json"),
            rpcs: process.env.CONFIG_RPCS_MOUNT_PATH || join(process.cwd(), ".mount", "config", "rpcs.json"),
        },
    },
    pollers: {
        interval: parseInt(process.env.POLLER_INTERVAL || "10000", 10), // 10s
        failedJobs: {
            maxRetries: parseInt(process.env.POLLER_FAILED_JOBS_MAX_RETRIES || "10", 10), // 10 retries for each job
            lookbackDuration: parseFloat(
                process.env.POLLER_FAILED_JOBS_LOOKBACK_DURATION ?? ms("6h").toString(),
            ),
        },
    },
    timeConfig: {
        lease: parseInt(process.env.TIME_CONFIG_LEASE || ms("5m").toString(), 10), // 5 minutes
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
        timeout: parseInt(process.env.BULLMQ_TIMEOUT || ms("30s").toString(), 10),
        stalledInterval: parseInt(process.env.BULLMQ_STALLED_INTERVAL || ms("30s").toString(), 10),
        maxStalledCount: parseInt(process.env.BULLMQ_MAX_STALLED_COUNT || "1", 10),
    },
    cors: {
        origins: Array.from({ length: 10 }, (_, i) =>
            process.env[`CORS_ORIGIN_${i + 1}`] || ""
        ).filter((url) => url !== ""),
    },
    kafka: {
        maxInFlightRequests: parseInt(process.env.KAFKA_MAX_IN_FLIGHT_REQUESTS || "20", 10), // 20 requests
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
        numPartitions: parseInt(process.env.KAFKA_NUM_PARTITIONS || "1", 10),
        replicationFactor: parseInt(process.env.KAFKA_REPLICATION_FACTOR || "1", 10),
        retentionMs: parseInt(process.env.KAFKA_RETENTION_MS || ms("1s").toString(), 10), // 1 second
        cleanupPolicy: process.env.KAFKA_CLEANUP_POLICY || "delete",
        segmentMs: parseInt(process.env.KAFKA_SEGMENT_MS || "1000", 10), // 1 second
        segmentBytes: parseInt(process.env.KAFKA_SEGMENT_BYTES || bytes("10MB"), 10), // 10 MB
        maxMessageBytes: parseInt(process.env.KAFKA_MAX_MESSAGE_BYTES || bytes("1KB"), 10), // 1 KB
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
        executorId: process.env.BOT_EXECUTOR_ID || "6956717486b425cf9938c665",
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
