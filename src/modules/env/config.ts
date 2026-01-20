import {
    join 
} from "path"
import {
    parseEnvMs,
    parseEnvString,
    parseEnvBoolean,
    parseEnvFloat,
    parseEnvInt
} from "./utils"

export const envConfig = () => ({
    // is production
    isProduction: parseEnvString("NODE_ENV",
        "development") === "production",
    // client config
    client: {
        axios: {
            retry: {
                delay: parseEnvMs("CLIENT_AXIOS_RETRY_DELAY",
                    "1s"),
                maxRetries: parseEnvInt("CLIENT_AXIOS_RETRY_MAX_RETRIES",
                    3),
            },
        },
        apollo: {
            timeout: {
                ms: parseEnvMs("CLIENT_APOLLO_TIMEOUT_MS",
                    "10s"),
            },
            retry: {
                jitter: parseEnvBoolean("CLIENT_APOLLO_RETRY_JITTER",
                    true),
                initial: parseEnvMs("CLIENT_APOLLO_RETRY_INITIAL",
                    "1s"),
                max: parseEnvMs("CLIENT_APOLLO_RETRY_MAX",
                    "10s"),
                maxRetries: parseEnvInt("CLIENT_APOLLO_RETRY_MAX_RETRIES",
                    3),
            },
        },
    },
    // retry config
    retry: {
        base: {
            retries: parseEnvInt("RETRY_BASE_RETRIES",
                3),
            factor: parseEnvFloat("RETRY_BASE_FACTOR",
                2),
            minTimeout: parseEnvMs("RETRY_BASE_MIN_TIMEOUT",
                "1s"),
            maxTimeout: parseEnvMs("RETRY_BASE_MAX_TIMEOUT",
                "10s"),
            randomize: parseEnvBoolean("RETRY_BASE_RANDOMIZE",
                true),
        },
    },
    // transaction config
    transaction: {
        swap: {
            slippage: parseEnvFloat("TRANSACTION_SWAP_SLIPPAGE",
                0.005),
        },
    },
    // computation config
    computation: {
        amount: {
            fractionDigits: parseEnvInt("COMPUTATION_AMOUNT_FRACTION_DIGITS",
                10),
        },
        operation: {
            fractionDigits: parseEnvInt("COMPUTATION_OPERATION_FRACTION_DIGITS",
                10),
        },
    },
    // time config
    priceFeeds: {
        coingecko: {
            interval: {
                rest: parseEnvMs("PRICE_FEEDS_COINGECKO_INTERVAL_REST",
                    "10s"),
            },
            chunks: {
                rest: parseEnvInt("PRICE_FEEDS_COINGECKO_CHUNKS_REST",
                    10),
            },
        },
        pyth: {
            interval: {
                rest: parseEnvMs("PRICE_FEEDS_PYTH_INTERVAL_REST",
                    "10s"),
            },
            chunks: {
                rest: parseEnvInt("PRICE_FEEDS_PYTH_CHUNKS_REST",
                    10),
                subscription: parseEnvInt("PRICE_FEEDS_PYTH_CHUNKS_SUBSCRIPTION",
                    10),
            },
        },
        coinmarketcap: {
            interval: {
                rest: parseEnvMs("PRICE_FEEDS_COINMARKETCAP_INTERVAL_REST",
                    "5m"),
            },
            chunks: {
                rest: parseEnvInt("PRICE_FEEDS_COINMARKETCAP_CHUNKS_REST",
                    10),
            },
        },
    },
    cexes: {
        binance: {
            slippage: parseEnvFloat("CEXES_BINANCE_BINANCE_SLIPPAGE",
                0.05),
            interval: {
                rest: parseEnvMs("CEXES_BINANCE_INTERVAL_REST",
                    "10s"),
            },
            chunks: {
                lastPrice: parseEnvInt("CEXES_BINANCE_CHUNKS_LAST_PRICE",
                    10),
                orderBook: parseEnvInt("CEXES_BINANCE_CHUNKS_ORDER_BOOK",
                    10),
            },
            ws: {
                idleTimeout: parseEnvMs("CEXES_BINANCE_WS_IDLE_TIMEOUT",
                    "10s"),
            },
        },
        gate: {
            slippage: parseEnvFloat("CEXES_GATE_SLIPPAGE",
                0.05),
            interval: {
                rest: parseEnvMs("CEXES_GATE_INTERVAL_REST",
                    "10s"),
            },
            chunks: {
                lastPrice: parseEnvInt("CEXES_GATE_CHUNKS_LAST_PRICE",
                    10),    
                orderBook: parseEnvInt("CEXES_GATE_CHUNKS_ORDER_BOOK",
                    10),
            },
            ws: {
                idleTimeout: parseEnvMs("CEXES_GATE_WS_IDLE_TIMEOUT",
                    "10s"),
            },
        },
        bybit: {
            slippage: parseEnvFloat("CEXES_BYBIT_SLIPPAGE",
                0.05),
            interval: {
                rest: parseEnvMs("CEXES_BYBIT_INTERVAL_REST",
                    "10s"),
            },
            chunks: {
                lastPrice: parseEnvInt("CEXES_BYBIT_CHUNKS_LAST_PRICE",
                    10),
                orderBook: parseEnvInt("CEXES_BYBIT_CHUNKS_ORDER_BOOK",
                    10),
            },
        },
        ws: {
            idleTimeout: parseEnvMs("CEXES_WS_IDLE_TIMEOUT",
                "10s"),
        },
    },
    dexes: {
        cetus: {
            interval: {
                analytics: parseEnvMs("DEXES_CETUS_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseEnvMs("DEXES_CETUS_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                }
            },
            openPosition: {
                slippage: parseEnvFloat("DEXES_CETUS_OPEN_POSITION_SLIPPAGE",
                    0.05), 
            },
        },
        flowx: {
            interval: {
                analytics: parseEnvMs("DEXES_FLOWX_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseEnvMs("DEXES_FLOWX_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseEnvFloat("DEXES_FLOWX_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
        momentum: {
            interval: {
                analytics: parseEnvMs("DEXES_MOMENTUM_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseEnvMs("DEXES_MOMENTUM_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseEnvFloat("DEXES_MOMENTUM_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
        turbos: {
            interval: {
                analytics: parseEnvMs("DEXES_TURBOS_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseEnvMs("DEXES_TURBOS_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseEnvFloat("DEXES_TURBOS_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
        meteora: {
            openPosition: {
                slippage: parseEnvFloat("DEXES_METEORA_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
            interval: {
                analytics: parseEnvMs("DEXES_METEORA_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseEnvMs("DEXES_METEORA_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
        },
        raydium: {
            interval: {
                analytics: parseEnvMs("DEXES_RAYDIUM_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseEnvMs("DEXES_RAYDIUM_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseEnvFloat("DEXES_RAYDIUM_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
        orca: {
            interval: {
                analytics: parseEnvMs("DEXES_ORCA_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseEnvMs("DEXES_ORCA_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseEnvFloat("DEXES_ORCA_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
        saros: {
            interval: {
                analytics: parseEnvMs("DEXES_SAROS_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseEnvMs("DEXES_SAROS_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseEnvFloat("DEXES_SAROS_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
    },
    // executor config
    executor: {
        id: parseEnvString("EXECUTOR_ID",
            "6956717486b425cf9938c665"),
    },
    // quote config
    quote: {
        ratio: {
            /**
            * Safe quote ratio range.
            * When the current quote ratio stays within this range, the system won't trigger a swap.
            * Falling outside this range means the position is becoming unbalanced → a swap may be required.
            */
            safe: {
                above: parseEnvFloat("QUOTE_RATIO_SAFE_ABOVE",
                    0.85),
                below: parseEnvFloat("QUOTE_RATIO_SAFE_BELOW",
                    0.15),
            },
            /**
            * Target quote ratio after a swap.
            * This is the range we try to push the position into after swapping,
            * so the system avoids slippage and doesn't keep re-swapping immediately.
            */
            expected: {
                above: parseEnvFloat("QUOTE_RATIO_EXPECTED_ABOVE",
                    0.8),
                below: parseEnvFloat("QUOTE_RATIO_EXPECTED_BELOW",
                    0.2),
            },
        },
    },
    // cache config
    cache: {
        ttl: {
            sessionId: parseEnvMs(
                "CACHE_TTL_SESSION_ID",
                "15m"),
            aggregatedTokenPrice: parseEnvInt(
                "CACHE_TTL_AGGREGATED_TOKEN_PRICE",
                0),
            dynamicClmmLiquidityPoolInfo: parseEnvInt(
                "CACHE_TTL_DYNAMIC_CLMM_LIQUIDITY_POOL_INFO",
                0),
            dynamicDlmmLiquidityPoolInfo: parseEnvInt(
                "CACHE_TTL_DYNAMIC_DLMM_LIQUIDITY_POOL_INFO",
                0),
            poolAnalytics: parseEnvInt(
                "CACHE_TTL_POOL_ANALYTICS",
                0),
        },
        stale: {
            priceMaxAgeMs: parseEnvMs(
                "CACHE_STALE_PRICE_MAX_AGE_MS",
                "10s"),
        },
    },
    // price config
    price: {
        deviationMaxRatio: parseEnvFloat("PRICE_DEVIATION_MAX_RATIO",
            0.01),
    },
    // pagination config
    pagination: {
        bots: {
            limit: {
                default: parseEnvInt("PAGINATION_BOTS_LIMIT_DEFAULT",
                    20),
                min: parseEnvInt("PAGINATION_BOTS_LIMIT_MIN",
                    1),
                max: parseEnvInt("PAGINATION_BOTS_LIMIT_MAX",
                    20),
            },
            pageNumber: {
                default: parseEnvInt("PAGINATION_BOTS_PAGE_NUMBER_DEFAULT",
                    1),
                max: parseEnvInt("PAGINATION_BOTS_PAGE_NUMBER_MAX",
                    100),
            },
        },
        positions: {
            limit: {
                default: parseEnvInt("PAGINATION_POSITIONS_LIMIT_DEFAULT",
                    10),
                min: parseEnvInt("PAGINATION_POSITIONS_LIMIT_MIN",
                    10),
                max: parseEnvInt("PAGINATION_POSITIONS_LIMIT_MAX",
                    10),
            },
            pageNumber: {
                default: parseEnvInt("PAGINATION_POSITIONS_PAGE_NUMBER_DEFAULT",
                    10),
                max: parseEnvInt("PAGINATION_POSITIONS_PAGE_NUMBER_MAX",
                    100),
            },
        },
        transactions: {
            limit: {
                default: parseEnvInt("PAGINATION_TRANSACTIONS_LIMIT_DEFAULT",
                    10),
                min: parseEnvInt("PAGINATION_TRANSACTIONS_LIMIT_MIN",
                    10),
                max: parseEnvInt("PAGINATION_TRANSACTIONS_LIMIT_MAX",
                    10),
            },
            pageNumber: {
                default: parseEnvInt("PAGINATION_TRANSACTIONS_PAGE_NUMBER_DEFAULT",
                    10),
                max: parseEnvInt("PAGINATION_TRANSACTIONS_PAGE_NUMBER_MAX",
                    100),
            },
        },
        liquidityPools: {
            limit: {
                default: parseEnvInt("PAGINATION_LIQUIDITY_POOLS_LIMIT_DEFAULT",
                    10),
                min: parseEnvInt("PAGINATION_LIQUIDITY_POOLS_LIMIT_MIN",
                    10),
                max: parseEnvInt("PAGINATION_LIQUIDITY_POOLS_LIMIT_MAX",
                    10),
            },
            pageNumber: {
                default: parseEnvInt("PAGINATION_LIQUIDITY_POOLS_PAGE_NUMBER_DEFAULT",
                    10),
                max: parseEnvInt("PAGINATION_LIQUIDITY_POOLS_PAGE_NUMBER_MAX",
                    100),
            },
        },
    },
    // redis config
    redis: {
        cache: {
            host: parseEnvString("REDIS_CACHE_HOST",
                "localhost"),
            port: parseEnvInt("REDIS_CACHE_PORT",
                6379),
            password: parseEnvString("REDIS_CACHE_PASSWORD",
                "Cuong123_A"),
            useCluster: parseEnvBoolean("REDIS_CACHE_USE_CLUSTER",
                false),
        },
        bullmq: {
            host: parseEnvString("REDIS_BULLMQ_HOST",
                "localhost"),
            port: parseEnvInt("REDIS_BULLMQ_PORT",
                6379),
            password: parseEnvString("REDIS_BULLMQ_PASSWORD",
                "Cuong123_A"),
            useCluster: parseEnvBoolean("REDIS_BULLMQ_USE_CLUSTER",
                false),
        },
        throttler: {
            host: parseEnvString("REDIS_THROTTLER_HOST",
                "localhost"),
            port: parseEnvInt("REDIS_THROTTLER_PORT",
                6379),
            password: parseEnvString("REDIS_THROTTLER_PASSWORD",
                "Cuong123_A"),
            useCluster: parseEnvBoolean("REDIS_THROTTLER_USE_CLUSTER",
                false),
        }
    },
    // database config
    databases: {
        mongoose: {
            primary: {
                host: parseEnvString("PRIMARY_MONGO_DB_HOST",
                    "localhost"),
                port: parseEnvInt("PRIMARY_MONGO_DB_PORT",
                    27018),
                password: parseEnvString("PRIMARY_MONGO_DB_PASSWORD",
                    "Cuong123_A"),
                username: parseEnvString("PRIMARY_MONGO_DB_USERNAME",
                    "root"),
                dbName: parseEnvString("PRIMARY_MONGO_DB_NAME",
                    "cicore"),
            },
        },
    },
    // loki config
    loki: {
        host: parseEnvString("LOKI_HOST",
            "http://localhost:3100"),
        requireAuth: parseEnvBoolean("LOKI_REQUIRE_AUTH",
            false),
        username: parseEnvString("LOKI_USERNAME",
            ""),
        password: parseEnvString("LOKI_PASSWORD",
            ""),
    },
    // history config
    history: {
        serieCount: parseEnvInt("HISTORY_SERIE_COUNT",
            5000),
    },
    // mount path config
    mountPath: {
        data: {
            restore: parseEnvString("DATA_RESTORE_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "data",
                    "restore")),
            backup: parseEnvString("DATA_BACKUP_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "data",
                    "backup")),
        },
        terraform: {
            coinMarketCapApiKey: parseEnvString("TERRAFORM_COINMARKETCAP_API_KEY_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "coinmarketcap-api.key")),
            encryptedAesKey: parseEnvString("TERRAFORM_ENCRYPTED_AES_KEY_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "encrypted-aes.key")),
            encryptedJwtSecretKey: parseEnvString("TERRAFORM_ENCRYPTED_JWT_SECRET_KEY_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "encrypted-jwt-secret.key")),
            gcpCryptoKeyEdSa: parseEnvString("TERRAFORM_GCP_CRYPTO_KEY_ED_SA_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "gcp-crypto-key-ed-sa.json")),
            gcpGoogleDriveUdSa: parseEnvString("TERRAFORM_GCP_GOOGLE_DRIVE_UD_SA_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "gcp-google-drive-ud-sa.json")),
            gcpCloudKmsCryptoOperatorSa: parseEnvString("TERRAFORM_GCP_CLOUD_KMS_CRYPTO_OPERATOR_SA_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "gcp-cloud-kms-crypto-operator-sa.json")),
            privyAppSecretKey: parseEnvString("TERRAFORM_PRIVY_APP_SECRET_KEY_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "privy-app-secret.key")),
            privySignerPrivateKey: parseEnvString("TERRAFORM_PRIVY_SIGNER_PRIVATE_KEY_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "privy-signer-private-key.key")),
        },
        config: {
            app: parseEnvString("CONFIG_APP_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "config",
                    "app.json")),
            rpcs: parseEnvString("CONFIG_RPCS_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "config",
                    "rpcs.json")),
        },
    },
    // jwt config
    jwt: {
        accessToken: {
            expiration: parseEnvMs("JWT_ACCESS_TOKEN_EXPIRATION",
                "1h"),
        },
        refreshToken: {
            expiration: parseEnvMs("JWT_REFRESH_TOKEN_EXPIRATION",
                "1d"),
        },
    },
    // rpc config
    rpc: {
        ejection: {
            ttl: parseEnvMs("RPCS_EJECTION_TTL",
                "1h"),
        }
    },
    // kafka config
    kafka: {
        maxInFlightRequests: parseEnvInt("KAFKA_MAX_IN_FLIGHT_REQUESTS",
            20),
        metadataStabilizationDelayMs: parseEnvMs("KAFKA_METADATA_STABILIZATION_DELAY_MS",
            "1s"),
        kafkaTopicPollIntervalMs: parseEnvMs("KAFKA_TOPIC_POLL_INTERVAL_MS",
            "500ms"),
        kafkaTopicPollTimeoutMs: parseEnvMs("KAFKA_TOPIC_POLL_TIMEOUT_MS",
            "10s"),
        resetTopics: parseEnvBoolean("KAFKA_RESET_TOPICS",
            false),
        heartbeatInterval: parseEnvMs("KAFKA_HEARTBEAT_INTERVAL",
            "3s"), // 3 seconds
        retry: {
            retries: parseEnvInt("KAFKA_RETRY_RETRIES",
                10), // 10 retries
            restartOnFailure: parseEnvBoolean("KAFKA_RETRY_RESTART_ON_FAILURE",
                true),
            factor: parseEnvFloat("KAFKA_RETRY_FACTOR",
                2.0), // 2x exponential backoff
        },
        numPartitions: parseEnvInt("KAFKA_NUM_PARTITIONS",
            1),
        replicationFactor: parseEnvInt("KAFKA_REPLICATION_FACTOR",
            1),
        retentionMs: parseEnvMs("KAFKA_RETENTION_MS",
            "1s"), // 1 second
        cleanupPolicy: parseEnvString("KAFKA_CLEANUP_POLICY",
            "delete"),
        segmentMs: parseEnvInt("KAFKA_SEGMENT_MS",
            1000), // 1 second
        segmentBytes: parseEnvInt("KAFKA_SEGMENT_BYTES",
            10485760), // 10 MB
        maxMessageBytes: parseEnvInt("KAFKA_MAX_MESSAGE_BYTES",
            1024), // 1 KB
        fileDeleteDelayMs: parseEnvMs("KAFKA_FILE_DELETE_DELAY_MS",
            "1s"), // 1 second
        host: parseEnvString("KAFKA_BROKER_HOST",
            "localhost"),
        port: parseEnvInt("KAFKA_BROKER_PORT",
            9092),
        sasl: {
            enabled: parseEnvBoolean("KAFKA_SASL_ENABLED",
                false),
            username: parseEnvString("KAFKA_SASL_USERNAME",
                ""),
            password: parseEnvString("KAFKA_SASL_PASSWORD",
                ""),
        },
    },
    // salt config
    salt: {
        jwt: parseEnvString("SALT_JWT",
            "ZsOM7sCx0UemrdC3gsi2q6NRQLb7TCsI"),
        aesCbc: parseEnvString("SALT_AES_CBC",
            "ZsOM7sCx0UemrdC3gsi2q6NRQLb7TCsI"),
    },
    // bullmq config
    bullmq: {
        attempts: parseEnvInt("BULLMQ_ATTEMPTS",
            5),
        delay: parseEnvMs("BULLMQ_DELAY",
            "200ms"),
        concurrency: parseEnvInt("BULLMQ_CONCURRENCY",
            1000),
        batchSize: parseEnvInt("BULLMQ_BATCH_SIZE",
            1000),
        lockDuration: parseEnvMs("BULLMQ_LOCK_DURATION",
            "10s"),
        completedJobCount: parseEnvInt("BULLMQ_COMPLETED_JOB_COUNT",
            1000),
        failedJobCount: parseEnvInt("BULLMQ_FAILED_JOB_COUNT",
            1000),
        timeout: parseEnvMs("BULLMQ_TIMEOUT",
            "30s"),
        stalledInterval: parseEnvMs("BULLMQ_STALLED_INTERVAL",
            "30s"),
        maxStalledCount: parseEnvInt("BULLMQ_MAX_STALLED_COUNT",
            1),
    },
    // k8s
    k8s: {
        podNamespace: parseEnvString("K8S_POD_NAMESPACE",
            "default"),
        executor: {
            probes: {
                liveness: {
                    failureThreshold: parseEnvInt("K8S_EXECUTOR_PROBES_LIVENESS_FAILURE_THRESHOLD",
                        3),
                    httpGet: {
                        path: parseEnvString("K8S_EXECUTOR_PROBES_LIVENESS_PATH",
                            "/api/terminus/liveness"),
                        port: parseEnvString("K8S_EXECUTOR_PROBES_LIVENESS_PORT",
                            "app"),
                        scheme: parseEnvString("K8S_EXECUTOR_PROBES_LIVENESS_SCHEME",
                            "HTTP"),
                    },
                    initialDelaySeconds: parseEnvMs("K8S_EXECUTOR_PROBES_LIVENESS_INITIAL_DELAY_SECONDS",
                        "30s"),
                    periodSeconds: parseEnvMs("K8S_EXECUTOR_PROBES_LIVENESS_PERIOD_SECONDS",
                        "10s"),
                    successThreshold: parseEnvInt("K8S_EXECUTOR_PROBES_LIVENESS_SUCCESS_THRESHOLD",
                        1),
                    timeoutSeconds: parseEnvMs("K8S_EXECUTOR_PROBES_LIVENESS_TIMEOUT_SECONDS",
                        "5s"),
                },
                readiness: {
                    failureThreshold: parseEnvInt("K8S_EXECUTOR_PROBES_READINESS_FAILURE_THRESHOLD",
                        3),
                    httpGet: {
                        path: parseEnvString("K8S_EXECUTOR_PROBES_READINESS_PATH",
                            "/api/terminus/readiness"),
                        port: parseEnvString("K8S_EXECUTOR_PROBES_READINESS_PORT",
                            "app"),
                        scheme: parseEnvString("K8S_EXECUTOR_PROBES_READINESS_SCHEME",
                            "HTTP"),
                    },
                    initialDelaySeconds: parseEnvMs("K8S_EXECUTOR_PROBES_READINESS_INITIAL_DELAY_SECONDS",
                        "30s"),
                    periodSeconds: parseEnvMs("K8S_EXECUTOR_PROBES_READINESS_PERIOD_SECONDS",
                        "10s"),
                    successThreshold: parseEnvInt("K8S_EXECUTOR_PROBES_READINESS_SUCCESS_THRESHOLD",
                        1),
                    timeoutSeconds: parseEnvMs("K8S_EXECUTOR_PROBES_READINESS_TIMEOUT_SECONDS",
                        "5s"),
                },
                startup: {
                    failureThreshold: parseEnvInt("K8S_EXECUTOR_PROBES_STARTUP_FAILURE_THRESHOLD",
                        3),
                    httpGet: {
                        path: parseEnvString("K8S_EXECUTOR_PROBES_STARTUP_PATH",
                            "/api/terminus/startup"),
                        port: parseEnvString("K8S_EXECUTOR_PROBES_STARTUP_PORT",
                            "app"),
                        scheme: parseEnvString("K8S_EXECUTOR_PROBES_STARTUP_SCHEME",
                            "HTTP"),
                    },
                    initialDelaySeconds: parseEnvMs("K8S_EXECUTOR_PROBES_STARTUP_INITIAL_DELAY_SECONDS",
                        "30s"),
                    periodSeconds: parseEnvMs("K8S_EXECUTOR_PROBES_STARTUP_PERIOD_SECONDS",
                        "10s"),
                    successThreshold: parseEnvInt("K8S_EXECUTOR_PROBES_STARTUP_SUCCESS_THRESHOLD",
                        1),
                    timeoutSeconds: parseEnvMs("K8S_EXECUTOR_PROBES_STARTUP_TIMEOUT_SECONDS",
                        "5s"),
                }
            },
            image: parseEnvString("K8S_EXECUTOR_IMAGE",
                "nginx:alpine"),
            replicas: parseEnvInt("K8S_EXECUTOR_REPLICAS",
                1),
            envVarsConfigMapName: parseEnvString("K8S_EXECUTOR_ENV_VARS_CONFIG_MAP_NAME",
                "kani-executor-service-env-vars"),
            envVarsSecretName: parseEnvString("K8S_EXECUTOR_ENV_VARS_SECRET_NAME",
                "kani-executor-service-env-vars"),
            resources: {
                limits: {
                    cpu: parseEnvString("K8S_EXECUTOR_RESOURCES_LIMITS_CPU",
                        "512m"),
                    memory: parseEnvString("K8S_EXECUTOR_RESOURCES_LIMITS_MEMORY",
                        "1Gi"),
                },
                requests: {
                    cpu: parseEnvString("K8S_EXECUTOR_RESOURCES_REQUESTS_CPU",
                        "64m"),
                    memory: parseEnvString("K8S_EXECUTOR_RESOURCES_REQUESTS_MEMORY",
                        "128Mi"),
                },
            },
            nodePool: parseEnvString("K8S_EXECUTOR_NODE_POOL",
                "kani-primary-node-pool"),
        },
    },
    // resources config
    resources: {
        ram: {
            threadhold: parseEnvInt("RAM_ALLOCATION_THRESHOLD",
                250), 
        }, 
        disk: {
            threadholdPercent: parseEnvFloat("DISK_ALLOCATION_THRESHOLD",
                0.8), 
        }, 
    },
    // ports config
    ports: {
        kaniInterface: parseEnvInt("KANI_INTERFACE_PORT",
            3001),
        kaniCoordinator: parseEnvInt("KANI_COORDINATOR_PORT",
            3002),
        kaniExecutor: parseEnvInt("KANI_EXECUTOR_PORT",
            3003),
        botCoordinator: parseEnvInt("BOT_COORDINATOR_PORT",
            3002),
        botExecutor: parseEnvInt("BOT_EXECUTOR_PORT",
            3004),
        kaniObserver: parseEnvInt("KANI_OBSERVER_PORT",
            3005),
    },
    // cors config
    cors: {
        origins: Array.from({
            length: 10 
        },
        (_, i) =>
            parseEnvString(`CORS_ORIGIN_${i + 1}`,
                "")
        ).filter((url) => url !== ""),
    },
    // coordinator config
    coordinator: {
        version: parseEnvString("COORDINATOR_VERSION",
            "1"),
        streams: {
            mongoDbChangeStream: {
                timeout: parseEnvMs(
                    "COORDINATOR_STREAMS_MONGO_DB_CHANGE_STREAM_TIMEOUT",
                    "30m"
                ),
            },
        },
        interval: {
            load: parseEnvMs("COORDINATOR_INTERVAL_LOAD",
                "10s"),
        }
    },
})
