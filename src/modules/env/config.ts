import {
    join 
} from "path"
import {
    parseMs,
    parseString,
    parseBoolean,
    parseFloat,
    parseInt
} from "./utils"

export const envConfig = () => ({
    // is production
    isProduction: parseString("NODE_ENV",
        "development") === "production",
    // client config
    client: {
        axios: {
            retry: {
                delay: parseMs("CLIENT_AXIOS_RETRY_DELAY",
                    "1s"),
                maxRetries: parseInt("CLIENT_AXIOS_RETRY_MAX_RETRIES",
                    3),
            },
        },
        apollo: {
            timeout: {
                ms: parseMs("CLIENT_APOLLO_TIMEOUT_MS",
                    "10s"),
            },
            retry: {
                jitter: parseBoolean("CLIENT_APOLLO_RETRY_JITTER",
                    true),
                initial: parseMs("CLIENT_APOLLO_RETRY_INITIAL",
                    "1s"),
                max: parseMs("CLIENT_APOLLO_RETRY_MAX",
                    "10s"),
                maxRetries: parseInt("CLIENT_APOLLO_RETRY_MAX_RETRIES",
                    3),
            },
        },
    },
    // retry config
    retry: {
        base: {
            retries: parseInt("RETRY_BASE_RETRIES",
                3),
            factor: parseFloat("RETRY_BASE_FACTOR",
                2),
            minTimeout: parseMs("RETRY_BASE_MIN_TIMEOUT",
                "1s"),
            maxTimeout: parseMs("RETRY_BASE_MAX_TIMEOUT",
                "10s"),
            randomize: parseBoolean("RETRY_BASE_RANDOMIZE",
                true),
        },
    },
    // transaction config
    transaction: {
        swap: {
            slippage: parseFloat("TRANSACTION_SWAP_SLIPPAGE",
                0.005),
        },
    },
    // computation config
    computation: {
        amount: {
            fractionDigits: parseInt("COMPUTATION_AMOUNT_FRACTION_DIGITS",
                10),
        },
    },
    // time config
    priceFeeds: {
        coingecko: {
            interval: {
                rest: parseMs("PRICE_FEEDS_COINGECKO_INTERVAL_REST",
                    "10s"),
            },
        },
        pyth: {
            interval: {
                rest: parseMs("PRICE_FEEDS_PYTH_INTERVAL_REST",
                    "10s"),
            },
        },
        coinmarketcap: {
            interval: {
                rest: parseMs("PRICE_FEEDS_COINMARKETCAP_INTERVAL_REST",
                    "5m"),
            },
        },
    },
    cexes: {
        binance: {
            slippage: parseFloat("CEXES_BINANCE_BINANCE_SLIPPAGE",
                0.05),
            interval: {
                rest: parseMs("CEXES_BINANCE_INTERVAL_REST",
                    "10s"),
            },
        },
        gate: {
            slippage: parseFloat("CEXES_GATE_SLIPPAGE",
                0.05),
            interval: {
                rest: parseMs("CEXES_GATE_INTERVAL_REST",
                    "10s"),
            },
        },
        bybit: {
            slippage: parseFloat("CEXES_BYBIT_SLIPPAGE",
                0.05),
            interval: {
                rest: parseMs("CEXES_BYBIT_INTERVAL_REST",
                    "10s"),
            },
        },
    },
    dexes: {
        cetus: {
            interval: {
                analytics: parseMs("DEXES_CETUS_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseMs("DEXES_CETUS_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                }
            },
            openPosition: {
                slippage: parseFloat("DEXES_CETUS_OPEN_POSITION_SLIPPAGE",
                    0.05), 
            },
        },
        flowx: {
            interval: {
                analytics: parseMs("DEXES_FLOWX_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseMs("DEXES_FLOWX_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseFloat("DEXES_FLOWX_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
        momentum: {
            interval: {
                analytics: parseMs("DEXES_MOMENTUM_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseMs("DEXES_MOMENTUM_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseFloat("DEXES_MOMENTUM_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
        turbos: {
            interval: {
                analytics: parseMs("DEXES_TURBOS_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseMs("DEXES_TURBOS_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseFloat("DEXES_TURBOS_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
        meteora: {
            openPosition: {
                slippage: parseFloat("DEXES_METEORA_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
            interval: {
                analytics: parseMs("DEXES_METEORA_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseMs("DEXES_METEORA_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
        },
        raydium: {
            interval: {
                analytics: parseMs("DEXES_RAYDIUM_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseMs("DEXES_RAYDIUM_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseFloat("DEXES_RAYDIUM_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
        orca: {
            interval: {
                analytics: parseMs("DEXES_ORCA_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseMs("DEXES_ORCA_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseFloat("DEXES_ORCA_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
        saros: {
            interval: {
                analytics: parseMs("DEXES_SAROS_INTERVAL_ANALYTICS",
                    "1m"),
                observer: {
                    fetch: parseMs("DEXES_SAROS_INTERVAL_OBSERVER_FETCH",
                        "10s"),
                },
            },
            openPosition: {
                slippage: parseFloat("DEXES_SAROS_OPEN_POSITION_SLIPPAGE",
                    0.05),
            },
        },
    },
    // executor config
    executor: {
        id: parseString("EXECUTOR_ID",
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
                above: parseFloat("QUOTE_RATIO_SAFE_ABOVE",
                    0.85),
                below: parseFloat("QUOTE_RATIO_SAFE_BELOW",
                    0.15),
            },
            /**
            * Target quote ratio after a swap.
            * This is the range we try to push the position into after swapping,
            * so the system avoids slippage and doesn't keep re-swapping immediately.
            */
            expected: {
                above: parseFloat("QUOTE_RATIO_EXPECTED_ABOVE",
                    0.8),
                below: parseFloat("QUOTE_RATIO_EXPECTED_BELOW",
                    0.2),
            },
        },
    },
    // cache config
    cache: {
        stale: {
            priceMaxAgeMs: parseMs("CACHE_STALE_PRICE_MAX_AGE_MS",
                "10s"),
        },
    },
    // price config
    price: {
        deviationMaxRatio: parseFloat("PRICE_DEVIATION_MAX_RATIO",
            0.01),
    },
    // pagination config
    pagination: {
        bots: {
            limit: {
                default: parseInt("PAGINATION_BOTS_LIMIT_DEFAULT",
                    20),
                min: parseInt("PAGINATION_BOTS_LIMIT_MIN",
                    1),
                max: parseInt("PAGINATION_BOTS_LIMIT_MAX",
                    20),
            },
            pageNumber: {
                default: parseInt("PAGINATION_BOTS_PAGE_NUMBER_DEFAULT",
                    1),
                max: parseInt("PAGINATION_BOTS_PAGE_NUMBER_MAX",
                    100),
            },
        },
        positions: {
            limit: {
                default: parseInt("PAGINATION_POSITIONS_LIMIT_DEFAULT",
                    10),
                min: parseInt("PAGINATION_POSITIONS_LIMIT_MIN",
                    10),
                max: parseInt("PAGINATION_POSITIONS_LIMIT_MAX",
                    10),
            },
            pageNumber: {
                default: parseInt("PAGINATION_POSITIONS_PAGE_NUMBER_DEFAULT",
                    10),
                max: parseInt("PAGINATION_POSITIONS_PAGE_NUMBER_MAX",
                    100),
            },
        },
        transactions: {
            limit: {
                default: parseInt("PAGINATION_TRANSACTIONS_LIMIT_DEFAULT",
                    10),
                min: parseInt("PAGINATION_TRANSACTIONS_LIMIT_MIN",
                    10),
                max: parseInt("PAGINATION_TRANSACTIONS_LIMIT_MAX",
                    10),
            },
            pageNumber: {
                default: parseInt("PAGINATION_TRANSACTIONS_PAGE_NUMBER_DEFAULT",
                    10),
                max: parseInt("PAGINATION_TRANSACTIONS_PAGE_NUMBER_MAX",
                    100),
            },
        },
        liquidityPools: {
            limit: {
                default: parseInt("PAGINATION_LIQUIDITY_POOLS_LIMIT_DEFAULT",
                    10),
                min: parseInt("PAGINATION_LIQUIDITY_POOLS_LIMIT_MIN",
                    10),
                max: parseInt("PAGINATION_LIQUIDITY_POOLS_LIMIT_MAX",
                    10),
            },
            pageNumber: {
                default: parseInt("PAGINATION_LIQUIDITY_POOLS_PAGE_NUMBER_DEFAULT",
                    10),
                max: parseInt("PAGINATION_LIQUIDITY_POOLS_PAGE_NUMBER_MAX",
                    100),
            },
        },
    },
    // redis config
    redis: {
        cache: {
            host: parseString("REDIS_CACHE_HOST",
                "localhost"),
            port: parseInt("REDIS_CACHE_PORT",
                6379),
            password: parseString("REDIS_CACHE_PASSWORD",
                "Cuong123_A"),
            useCluster: parseBoolean("REDIS_CACHE_USE_CLUSTER",
                false),
        },
        bullmq: {
            host: parseString("REDIS_BULLMQ_HOST",
                "localhost"),
            port: parseInt("REDIS_BULLMQ_PORT",
                6379),
            password: parseString("REDIS_BULLMQ_PASSWORD",
                "Cuong123_A"),
            useCluster: parseBoolean("REDIS_BULLMQ_USE_CLUSTER",
                false),
        },
        throttler: {
            host: parseString("REDIS_THROTTLER_HOST",
                "localhost"),
            port: parseInt("REDIS_THROTTLER_PORT",
                6379),
            password: parseString("REDIS_THROTTLER_PASSWORD",
                "Cuong123_A"),
            useCluster: parseBoolean("REDIS_THROTTLER_USE_CLUSTER",
                false),
        }
    },
    // database config
    databases: {
        mongoose: {
            primary: {
                host: parseString("PRIMARY_MONGO_DB_HOST",
                    "localhost"),
                port: parseInt("PRIMARY_MONGO_DB_PORT",
                    27018),
                password: parseString("PRIMARY_MONGO_DB_PASSWORD",
                    "Cuong123_A"),
                username: parseString("PRIMARY_MONGO_DB_USERNAME",
                    "root"),
                dbName: parseString("PRIMARY_MONGO_DB_NAME",
                    "cicore"),
            },
        },
    },
    // loki config
    loki: {
        host: parseString("LOKI_HOST",
            "http://localhost:3100"),
        requireAuth: parseBoolean("LOKI_REQUIRE_AUTH",
            false),
        username: parseString("LOKI_USERNAME",
            ""),
        password: parseString("LOKI_PASSWORD",
            ""),
    },
    // history config
    history: {
        serieCount: parseInt("HISTORY_SERIE_COUNT",
            5000),
    },
    // mount path config
    mountPath: {
        data: {
            restore: parseString("DATA_RESTORE_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "data",
                    "restore")),
            backup: parseString("DATA_BACKUP_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "data",
                    "backup")),
        },
        terraform: {
            coinMarketCapApiKey: parseString("TERRAFORM_COINMARKETCAP_API_KEY_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "coinmarketcap-api.key")),
            encryptedAesKey: parseString("TERRAFORM_ENCRYPTED_AES_KEY_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "encrypted-aes.key")),
            encryptedJwtSecretKey: parseString("TERRAFORM_ENCRYPTED_JWT_SECRET_KEY_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "encrypted-jwt-secret.key")),
            gcpCryptoKeyEdSa: parseString("TERRAFORM_GCP_CRYPTO_KEY_ED_SA_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "gcp-crypto-key-ed-sa.json")),
            gcpGoogleDriveUdSa: parseString("TERRAFORM_GCP_GOOGLE_DRIVE_UD_SA_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "gcp-google-drive-ud-sa.json")),
            gcpCloudKmsCryptoOperatorSa: parseString("TERRAFORM_GCP_CLOUD_KMS_CRYPTO_OPERATOR_SA_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "gcp-cloud-kms-crypto-operator-sa.json")),
            privyAppSecretKey: parseString("TERRAFORM_PRIVY_APP_SECRET_KEY_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "privy-app-secret.key")),
            privySignerPrivateKey: parseString("TERRAFORM_PRIVY_SIGNER_PRIVATE_KEY_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "terraform",
                    "privy-signer-private-key.key")),
        },
        config: {
            app: parseString("CONFIG_APP_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "config",
                    "app.json")),
            rpcs: parseString("CONFIG_RPCS_MOUNT_PATH",
                join(process.cwd(),
                    ".mount",
                    "config",
                    "rpcs.json")),
        },
    },
    // chunks config
    chunks: {
        coingecko: {
            rest: parseInt("CHUNKS_COINGECKO_REST",
                10),
        },
        pyth: {
            rest: parseInt("CHUNKS_PYTH_REST",
                10),
        },
        coinmarketcap: {
            rest: parseInt("CHUNKS_COINMARKETCAP_REST",
                10),
        },
    },
})
