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
    time: {
        stale: {
            balanceSnapshot: parseMs("TIME_STALE_BALANCE_SNAPSHOT",
                "30s"),
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
})
