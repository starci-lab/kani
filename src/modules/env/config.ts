import {
    join
} from "path"
import {
    parseEnvMs,
    parseEnvString,
    parseEnvBoolean,
    parseEnvFloat,
    parseEnvInt,
    parseEnvSecond
} from "./utils/parse-env"
import bytes from "bytes"

/**
 * Builds the application config from environment variables.
 * Each value is read via a parseEnv* helper (env var name + default).
 * Called at runtime; defaults apply when the corresponding env var is unset.
 */
export const envConfig = () => ({
    /** True when NODE_ENV === "production". */
    isProduction: parseEnvString({
        key: "NODE_ENV",
        defaultValue: "development",
    }) === "production",
    /** HTTP/GraphQL client settings: Axios retry, Apollo timeout and retry. */
    client: {
        axios: {
            retry: {
                delay: parseEnvMs({
                    key: "CLIENT_AXIOS_RETRY_DELAY", defaultValue: "1s" 
                }),
                maxRetries: parseEnvInt({
                    key: "CLIENT_AXIOS_RETRY_MAX_RETRIES", defaultValue: 3 
                }),
            },
        },
        apollo: {
            timeout: {
                ms: parseEnvMs({
                    key: "CLIENT_APOLLO_TIMEOUT_MS", defaultValue: "10s" 
                }),
            },
            retry: {
                jitter: parseEnvBoolean({
                    key: "CLIENT_APOLLO_RETRY_JITTER", defaultValue: true 
                }),
                initial: parseEnvMs({
                    key: "CLIENT_APOLLO_RETRY_INITIAL", defaultValue: "1s" 
                }),
                max: parseEnvMs({
                    key: "CLIENT_APOLLO_RETRY_MAX", defaultValue: "10s" 
                }),
                maxRetries: parseEnvInt({
                    key: "CLIENT_APOLLO_RETRY_MAX_RETRIES", defaultValue: 3 
                }),
            },
        },
    },
    debug: {
        enabled: parseEnvBoolean({
            key: "DEBUG_ENABLED", defaultValue: false 
        }),
    },
    /** Generic retry policy (exponential backoff): retries, factor, timeouts, randomize. */
    retry: {
        base: {
            retries: parseEnvInt({
                key: "RETRY_BASE_RETRIES", defaultValue: 3 
            }),
            factor: parseEnvFloat({
                key: "RETRY_BASE_FACTOR", defaultValue: 2 
            }),
            minTimeout: parseEnvMs({
                key: "RETRY_BASE_MIN_TIMEOUT", defaultValue: "1s" 
            }),
            maxTimeout: parseEnvMs({
                key: "RETRY_BASE_MAX_TIMEOUT", defaultValue: "10s" 
            }),
            randomize: parseEnvBoolean({
                key: "RETRY_BASE_RANDOMIZE", defaultValue: true 
            }),
        },
    },
    /** Polling/wait policy: max retries and interval between attempts. */
    wait: {
        base: {
            retries: parseEnvInt({
                key: "WAIT_BASE_RETRIES", defaultValue: 30 
            }),
            intervalMs: parseEnvMs({
                key: "WAIT_BASE_INTERVAL_MS", defaultValue: "100ms" 
            }),
        },
    },
    /** On-chain transaction defaults (e.g. swap slippage tolerance). */
    transaction: {
        swap: {
            slippage: parseEnvFloat({
                key: "TRANSACTION_SWAP_SLIPPAGE", defaultValue: 0.005 
            }),
        },
    },
    /** Terminus: timeout for health checks. */
    terminus: {
        timeout: parseEnvMs({
            key: "TERMINUS_TIMEOUT", defaultValue: "30s", 
        }),
    },
    /** Numeric precision: fraction digits for amounts, rounding, and operations. */
    computation: {
        amount: {
            fractionDigits: parseEnvInt({
                key: "COMPUTATION_AMOUNT_FRACTION_DIGITS", defaultValue: 10 
            }),
        },
        round: {
            fractionDigits: parseEnvInt({
                key: "COMPUTATION_ROUND_FRACTION_DIGITS", defaultValue: 5 
            }),
        },
        operation: {
            fractionDigits: parseEnvInt({
                key: "COMPUTATION_OPERATION_FRACTION_DIGITS", defaultValue: 10 
            }),
        },
    },
    /** Price feed providers: request intervals and chunk sizes (REST / subscription). */
    priceFeeds: {
        coingecko: {
            interval: {
                rest: parseEnvMs({
                    key: "PRICE_FEEDS_COINGECKO_INTERVAL_REST", defaultValue: "10s" 
                }),
            },
            chunks: {
                rest: parseEnvInt({
                    key: "PRICE_FEEDS_COINGECKO_CHUNKS_REST", defaultValue: 20 
                }),
            },
        },
        pyth: {
            interval: {
                rest: parseEnvMs({
                    key: "PRICE_FEEDS_PYTH_INTERVAL_REST", defaultValue: "10s" 
                }),
            },
            chunks: {
                rest: parseEnvInt({
                    key: "PRICE_FEEDS_PYTH_CHUNKS_REST", defaultValue: 20 
                }),
                subscription: parseEnvInt({
                    key: "PRICE_FEEDS_PYTH_CHUNKS_SUBSCRIPTION", defaultValue: 5 
                }),
            },
        },
        coinmarketcap: {
            interval: {
                rest: parseEnvMs({
                    key: "PRICE_FEEDS_COINMARKETCAP_INTERVAL_REST", defaultValue: "5m" 
                }),
            },
            chunks: {
                rest: parseEnvInt({
                    key: "PRICE_FEEDS_COINMARKETCAP_CHUNKS_REST", defaultValue: 20 
                }),
            },
        },
    },
    /** CEX integrations: slippage, REST intervals, chunk sizes, WebSocket idle timeout. */
    cexes: {
        binance: {
            slippage: parseEnvFloat({
                key: "CEXES_BINANCE_BINANCE_SLIPPAGE", defaultValue: 0.05 
            }),
            interval: {
                rest: parseEnvMs({
                    key: "CEXES_BINANCE_INTERVAL_REST", defaultValue: "10s" 
                }),
            },
            chunks: {
                lastPrice: parseEnvInt({
                    key: "CEXES_BINANCE_CHUNKS_LAST_PRICE", defaultValue: 10 
                }),
                orderBook: parseEnvInt({
                    key: "CEXES_BINANCE_CHUNKS_ORDER_BOOK", defaultValue: 10 
                }),
            },
            ws: {
                idleTimeout: parseEnvMs({
                    key: "CEXES_BINANCE_WS_IDLE_TIMEOUT", defaultValue: "10s" 
                }),
            },
        },
        gate: {
            slippage: parseEnvFloat({
                key: "CEXES_GATE_SLIPPAGE", defaultValue: 0.05 
            }),
            interval: {
                rest: parseEnvMs({
                    key: "CEXES_GATE_INTERVAL_REST", defaultValue: "10s" 
                }),
            },
            chunks: {
                lastPrice: parseEnvInt({
                    key: "CEXES_GATE_CHUNKS_LAST_PRICE", defaultValue: 10 
                }),    
                orderBook: parseEnvInt({
                    key: "CEXES_GATE_CHUNKS_ORDER_BOOK", defaultValue: 10 
                }),
            },
            ws: {
                idleTimeout: parseEnvMs({
                    key: "CEXES_GATE_WS_IDLE_TIMEOUT", defaultValue: "10s" 
                }),
            },
        },
        bybit: {
            slippage: parseEnvFloat({
                key: "CEXES_BYBIT_SLIPPAGE", defaultValue: 0.05 
            }),
            interval: {
                rest: parseEnvMs({
                    key: "CEXES_BYBIT_INTERVAL_REST", defaultValue: "10s" 
                }),
            },
            chunks: {
                lastPrice: parseEnvInt({
                    key: "CEXES_BYBIT_CHUNKS_LAST_PRICE", defaultValue: 10 
                }),
                orderBook: parseEnvInt({
                    key: "CEXES_BYBIT_CHUNKS_ORDER_BOOK", defaultValue: 10 
                }),
            },
        },
        ws: {
            idleTimeout: parseEnvMs({
                key: "CEXES_WS_IDLE_TIMEOUT", defaultValue: "10s" 
            }),
        },
    },
    /** DEX integrations: analytics/observer intervals, open-position slippage per DEX. */
    dexes: {
        cetus: {
            interval: {
                analytics: parseEnvMs({
                    key: "DEXES_CETUS_INTERVAL_ANALYTICS", defaultValue: "1m" 
                }),
                observer: {
                    fetch: parseEnvMs({
                        key: "DEXES_CETUS_INTERVAL_OBSERVER_FETCH", defaultValue: "5s" 
                    }),
                }
            },
            openPosition: {
                slippage: parseEnvFloat({
                    key: "DEXES_CETUS_OPEN_POSITION_SLIPPAGE", defaultValue: 0.2
                }), 
            },
        },
        flowx: {
            interval: {
                analytics: parseEnvMs({
                    key: "DEXES_FLOWX_INTERVAL_ANALYTICS", defaultValue: "1m" 
                }),
                observer: {
                    fetch: parseEnvMs({
                        key: "DEXES_FLOWX_INTERVAL_OBSERVER_FETCH", defaultValue: "5s" 
                    }),
                },
            },
            openPosition: {
                slippage: parseEnvFloat({
                    key: "DEXES_FLOWX_OPEN_POSITION_SLIPPAGE", defaultValue: 0.5 
                }),
            },
        },
        momentum: {
            interval: {
                analytics: parseEnvMs({
                    key: "DEXES_MOMENTUM_INTERVAL_ANALYTICS", defaultValue: "1m" 
                }),
                observer: {
                    fetch: parseEnvMs({
                        key: "DEXES_MOMENTUM_INTERVAL_OBSERVER_FETCH", defaultValue: "5s" 
                    }),
                },
            },
            openPosition: {
                slippage: parseEnvFloat({
                    key: "DEXES_MOMENTUM_OPEN_POSITION_SLIPPAGE", defaultValue: 0.5
                }),
            },
        },
        turbos: {
            interval: {
                analytics: parseEnvMs({
                    key: "DEXES_TURBOS_INTERVAL_ANALYTICS", defaultValue: "1m" 
                }),
                observer: {
                    fetch: parseEnvMs({
                        key: "DEXES_TURBOS_INTERVAL_OBSERVER_FETCH", defaultValue: "5s" 
                    }),
                },
            },
            openPosition: {
                slippage: parseEnvFloat({
                    key: "DEXES_TURBOS_OPEN_POSITION_SLIPPAGE", defaultValue: 0.5
                }),
            },
        },
        meteora: {
            openPosition: {
                slippage: parseEnvFloat({
                    key: "DEXES_METEORA_OPEN_POSITION_SLIPPAGE", defaultValue: 0.2
                }),
            },
            interval: {
                analytics: parseEnvMs({
                    key: "DEXES_METEORA_INTERVAL_ANALYTICS", defaultValue: "1m" 
                }),
                observer: {
                    fetch: parseEnvMs({
                        key: "DEXES_METEORA_INTERVAL_OBSERVER_FETCH", defaultValue: "10s" 
                    }),
                },
            },
        },
        raydium: {
            interval: {
                analytics: parseEnvMs({
                    key: "DEXES_RAYDIUM_INTERVAL_ANALYTICS", defaultValue: "1m" 
                }),
                observer: {
                    fetch: parseEnvMs({
                        key: "DEXES_RAYDIUM_INTERVAL_OBSERVER_FETCH", defaultValue: "10s" 
                    }),
                },
            },
            openPosition: {
                slippage: parseEnvFloat({
                    key: "DEXES_RAYDIUM_OPEN_POSITION_SLIPPAGE", defaultValue: 0.2 
                }),
            },
        },
        orca: {
            interval: {
                analytics: parseEnvMs({
                    key: "DEXES_ORCA_INTERVAL_ANALYTICS", defaultValue: "1m" 
                }),
                observer: {
                    fetch: parseEnvMs({
                        key: "DEXES_ORCA_INTERVAL_OBSERVER_FETCH", defaultValue: "10s" 
                    }),
                },
            },
            openPosition: {
                slippage: parseEnvFloat({
                    key: "DEXES_ORCA_OPEN_POSITION_SLIPPAGE", defaultValue: 0.2
                }),
            },
        },
        saros: {
            interval: {
                analytics: parseEnvMs({
                    key: "DEXES_SAROS_INTERVAL_ANALYTICS", defaultValue: "1m" 
                }),
                observer: {
                    fetch: parseEnvMs({
                        key: "DEXES_SAROS_INTERVAL_OBSERVER_FETCH", defaultValue: "10s" 
                    }),
                },
            },
            openPosition: {
                slippage: parseEnvFloat({
                    key: "DEXES_SAROS_OPEN_POSITION_SLIPPAGE", defaultValue: 0.05 
                }),
            },
        },
    },
    /** Executor: capacity, streams, subscriptions, diagnose intervals, runtime (requeue, stimulate), lock TTL, job retention. */
    executor: {
        /** Consul service registration for DNS discovery. */
        consul: {
            /** Optional address for the executor (host/IP). Omit to use agent node address. */
            address: parseEnvString({
                key: "EXECUTOR_CONSUL_ADDRESS", defaultValue: "",
            }),
        },
        capacity: {
            maxBots: parseEnvInt({
                key: "EXECUTOR_CAPACITY_MAX_BOTS", defaultValue: 1000 
            }),
        },
        id: parseEnvString({
            key: "EXECUTOR_ID", defaultValue: "6956717486b425cf9938c665" 
        }),
        streams: {
            mongoDbChangeStream: {
                timeout: parseEnvMs({
                    key: "EXECUTOR_STREAMS_MONGO_DB_CHANGE_STREAM_TIMEOUT", defaultValue: "10s" 
                }),
            },
        },
        subscriptions: {
            clmm: {
                interval: parseEnvMs({
                    key: "EXECUTOR_SUBSCRIPTIONS_CLMM_INTERVAL", defaultValue: "1s" 
                }),
            },
            dlmm: {
                interval: parseEnvMs({
                    key: "EXECUTOR_SUBSCRIPTIONS_DLMM_INTERVAL", defaultValue: "1s" 
                }),
            },
        },
        diagnose: {
            price: {
                interval: parseEnvMs({
                    key: "EXECUTOR_DIAGNOSE_PRICE_INTERVAL", defaultValue: "1s" 
                }),
            },
            dynamicLiquidityPoolInfo: {
                interval: parseEnvMs({
                    key: "EXECUTOR_DIAGNOSE_DYNAMIC_LIQUIDITY_POOL_INFO_INTERVAL", defaultValue: "1s" 
                }),
            },
            liquidityPoolsSynced: {
                interval: parseEnvMs({
                    key: "EXECUTOR_DIAGNOSE_LIQUIDITY_POOLS_SYNCED_INTERVAL", defaultValue: "1s" 
                }),
                stale: parseEnvMs({
                    key: "EXECUTOR_DIAGNOSE_LIQUIDITY_POOLS_SYNCED_STALE", defaultValue: "10s" 
                }),
            },
        },
        interval: {
            load: parseEnvMs({
                key: "EXECUTOR_INTERVAL_LOAD", defaultValue: "10s" 
            }),
            rotate: parseEnvMs({
                key: "EXECUTOR_INTERVAL_ROTATE", defaultValue: "10s" 
            }),
            
        },
        runtime: {
            interval: {
                refresh: parseEnvMs({
                    key: "EXECUTOR_RUNTIME_INTERVAL_REFRESH", defaultValue: "10s" 
                }),
            },
            operation: {
                notSynced: {
                    interval: parseEnvMs({
                        key: "EXECUTOR_OPERATION_NOT_SYNCED_INTERVAL", defaultValue: "10s" 
                    }),
                },
                openPosition: {
                    requeue: {
                        interval: parseEnvMs({
                            key: "EXECUTOR_OPERATION_OPEN_POSITION_REQUEUE_INTERVAL", defaultValue: "10s" 
                        }),
                    },
                    stimulate: parseEnvBoolean({
                        key: "EXECUTOR_OPERATION_OPEN_POSITION_STIMULATE", defaultValue: false 
                    }),
                },
                closePosition: {
                    settle: {
                        enabled: parseEnvBoolean({
                            key: "EXECUTOR_OPERATION_CLOSE_POSITION_SETTLE_ENABLED", defaultValue: true 
                        }),
                    },
                    requeue: {
                        interval: parseEnvMs({
                            key: "EXECUTOR_OPERATION_CLOSE_POSITION_REQUEUE_INTERVAL", defaultValue: "10s" 
                        }),
                    },
                    stimulate: parseEnvBoolean({
                        key: "EXECUTOR_OPERATION_CLOSE_POSITION_STIMULATE", defaultValue: false
                    }),
                    stimulateConfirm: parseEnvBoolean({
                        key: "EXECUTOR_OPERATION_CLOSE_POSITION_STIMULATE_CONFIRM", defaultValue: false
                    }),
                },
                reconcileBalance: {
                    interval: {
                        poll: parseEnvMs({
                            key: "EXECUTOR_OPERATION_RECONCILE_BALANCE_INTERVAL_POLL", defaultValue: "10s" 
                        }),
                    },
                    cooldown: {
                        rescan: parseEnvMs({
                            key: "EXECUTOR_OPERATION_RECONCILE_BALANCE_COOLDOWN_RESCAN",
                            defaultValue: "30s"
                        }),
                    },
                    requeue: {
                        interval: parseEnvMs({
                            key: "EXECUTOR_OPERATION_REQUEUE_INTERVAL", defaultValue: "10s" 
                        }),
                    },
                    stimulate: parseEnvBoolean({
                        key: "EXECUTOR_OPERATION_RECONCILE_BALANCE_STIMULATE", defaultValue: false 
                    }),
                },
                withdraw: {
                    interval: {
                        poll: parseEnvMs({
                            key: "EXECUTOR_OPERATION_WITHDRAW_INTERVAL_POLL", defaultValue: "10s" 
                        }),
                    },
                    requeue: {
                        interval: parseEnvMs({
                            key: "EXECUTOR_OPERATION_WITHDRAW_REQUEUE_INTERVAL", defaultValue: "10s" 
                        }),
                    },
                    stimulate: parseEnvBoolean({
                        key: "EXECUTOR_OPERATION_WITHDRAW_STIMULATE", defaultValue: false 
                    }),
                },
            },
        },
        lockAuthority: {
            interval: {
                notifyExpiredLocks: parseEnvMs({
                    key: "EXECUTOR_LOCK_AUTHORITY_INTERVAL_NOTIFY_EXPIRED_LOCKS", defaultValue: "1s" 
                }),
            },
            ttl: parseEnvMs({
                key: "EXECUTOR_LOCK_AUTHORITY_TTL", defaultValue: "30s" 
            }),
        },
        workers: {
            /**
             * Job retention policy:
             * 0 = keep job data + metadata
             * 1 = keep job data, remove metadata
             * 2 = remove job completely
             */
            job: {
                retryInterval: parseEnvMs({
                    key: "EXECUTOR_WORKERS_JOB_RETRY_INTERVAL", defaultValue: "1s" 
                }),
                level: parseEnvInt({
                    key: "EXECUTOR_WORKERS_JOB_LEVEL", defaultValue: 0 
                }),
                txSignMaxRetries: parseEnvInt({
                    key: "EXECUTOR_WORKERS_JOB_TX_SIGN_MAX_RETRIES", defaultValue: 1 
                }),
                txExecuteMaxRetries: parseEnvInt({
                    key: "EXECUTOR_WORKERS_JOB_TX_EXECUTE_MAX_RETRIES", defaultValue: 2
                }),
                prepareMaxAttempts: parseEnvInt({
                    key: "EXECUTOR_WORKERS_JOB_PREPARE_MAX_ATTEMPTS", defaultValue: 3 
                }),
            },
        },
    },
    /** Socket.IO broadcast intervals for price and dynamic liquidity pool info. */
    socketIo: {
        price: {
            broadcast: {
                interval: parseEnvMs({
                    key: "SOCKET_IO_PRICE_BROADCAST_INTERVAL", defaultValue: "5s" 
                }),
            },
        },
        dynamic: {
            liquidityPoolsInfo: {
                interval: parseEnvMs({
                    key: "SOCKET_IO_DYNAMIC_LIQUIDITY_POOLS_INFO_INTERVAL", defaultValue: "5s" 
                }),
            },
        },
    },
    /** Quote ratio thresholds: safe range (no swap) and expected range after swap. */
    quote: {
        ratio: {
            /**
             * Safe quote ratio range.
             * When the current quote ratio stays within this range, the system won't trigger a swap.
             * Falling outside this range means the position is becoming unbalanced → a swap may be required.
             */
            safe: {
                above: parseEnvFloat({
                    key: "QUOTE_RATIO_SAFE_ABOVE", defaultValue: 0.85 
                }),
                below: parseEnvFloat({
                    key: "QUOTE_RATIO_SAFE_BELOW", defaultValue: 0.15 
                }),
            },
            /**
             * Target quote ratio after a swap.
             * This is the range we try to push the position into after swapping,
             * so the system avoids slippage and doesn't keep re-swapping immediately.
             */
            expected: {
                above: parseEnvFloat({
                    key: "QUOTE_RATIO_EXPECTED_ABOVE", defaultValue: 0.8 
                }),
                below: parseEnvFloat({
                    key: "QUOTE_RATIO_EXPECTED_BELOW", defaultValue: 0.2 
                }),
            },
        },
    },
    /** Winston log level. */
    winston: {
        level: parseEnvString({
            key: "WINSTON_LEVEL", defaultValue: "verbose" 
        }),
    },
    /** Cache: debug flags/TTL, key TTLs (withdraw, session, pool analytics, etc.), stale price max age. */
    cache: {
        debug: {
            enabled: parseEnvBoolean({
                key: "CACHE_DEBUG_ENABLED", defaultValue: true 
            }),
            ttl: parseEnvMs({
                key: "CACHE_DEBUG_TTL", defaultValue: "5000" 
            }),
            ok: {
                redis: parseEnvString({
                    key: "CACHE_DEBUG_OK_REDIS", defaultValue: "ok-redis" 
                }),
                memory: parseEnvString({
                    key: "CACHE_DEBUG_OK_MEMORY", defaultValue: "ok-memory" 
                }),
            },
        },
        ttl: {
            rotationBotAssignments: parseEnvMs({
                key: "CACHE_TTL_ROTATION_BOT_ASSIGNMENTS",
                defaultValue: "100years"
            }),
            kafkaMessageDigest: parseEnvMs({
                key: "CACHE_TTL_KAFKA_MESSAGE_DIGEST",
                defaultValue: "3s"
            }),
            withdraw: parseEnvMs({
                key: "CACHE_TTL_WITHDRAW",
                defaultValue: "5m"
            }),
            sendOtpCode: parseEnvMs({
                key: "CACHE_TTL_SEND_OTP_CODE",
                defaultValue: "10m"
            }),
            sessionId: parseEnvMs({
                key: "CACHE_TTL_SESSION_ID",
                defaultValue: "15m"
            }),
            aggregatedTokenPrice: parseEnvMs({
                key: "CACHE_TTL_AGGREGATED_TOKEN_PRICE",
                defaultValue: "100years"
            }),
            dynamicClmmLiquidityPoolInfo: parseEnvMs({
                key: "CACHE_TTL_DYNAMIC_CLMM_LIQUIDITY_POOL_INFO",
                defaultValue: "100years"
            }),
            dynamicDlmmLiquidityPoolInfo: parseEnvMs({
                key: "CACHE_TTL_DYNAMIC_DLMM_LIQUIDITY_POOL_INFO",
                defaultValue: "100years"
            }),
            poolAnalytics: parseEnvMs({
                key: "CACHE_TTL_POOL_ANALYTICS",
                defaultValue: "100years"
            }),
            liquidityPoolsSyncedDiagnosticReadiness: parseEnvMs(
                {
                    key: "CACHE_TTL_LIQUIDITY_POOLS_SYNCED_DIAGNOSTIC_READINESS",
                    defaultValue: "100years"
                }
            ),
        },
        stale: {
            priceMaxAgeMs: parseEnvMs(
                {
                    key: "CACHE_STALE_PRICE_MAX_AGE_MS",
                    defaultValue: "10s"
                }
            ),
            rotationBotAssignmentsMaxAgeMs: parseEnvMs(
                {
                    key: "CACHE_STALE_ROTATION_BOT_ASSIGNMENTS_MAX_AGE_MS",
                    defaultValue: "10s"
                }
            ),
        },
    },
    /** Price validation: max allowed deviation ratio. */
    price: {
        deviationMaxRatio: parseEnvFloat({
            key: "PRICE_DEVIATION_MAX_RATIO", defaultValue: 0.01 
        }),
    },
    /** API pagination: default/min/max limit and page number per resource (bots, positions, transactions, liquidity pools). */
    pagination: {
        bots: {
            limit: {
                default: parseEnvInt({
                    key: "PAGINATION_BOTS_LIMIT_DEFAULT", defaultValue: 20 
                }),
                min: parseEnvInt({
                    key: "PAGINATION_BOTS_LIMIT_MIN", defaultValue: 1 
                }),
                max: parseEnvInt({
                    key: "PAGINATION_BOTS_LIMIT_MAX", defaultValue: 20 
                }),
            },
            pageNumber: {
                default: parseEnvInt({
                    key: "PAGINATION_BOTS_PAGE_NUMBER_DEFAULT", defaultValue: 1 
                }),
                max: parseEnvInt({
                    key: "PAGINATION_BOTS_PAGE_NUMBER_MAX", defaultValue: 100 
                }),
            },
        },
        positions: {
            limit: {
                default: parseEnvInt({
                    key: "PAGINATION_POSITIONS_LIMIT_DEFAULT", defaultValue: 10 
                }),
                min: parseEnvInt({
                    key: "PAGINATION_POSITIONS_LIMIT_MIN", defaultValue: 10 
                }),
                max: parseEnvInt({
                    key: "PAGINATION_POSITIONS_LIMIT_MAX", defaultValue: 10 
                }),
            },
            pageNumber: {
                default: parseEnvInt({
                    key: "PAGINATION_POSITIONS_PAGE_NUMBER_DEFAULT", defaultValue: 10 
                }),
                max: parseEnvInt({
                    key: "PAGINATION_POSITIONS_PAGE_NUMBER_MAX", defaultValue: 100 
                }),
            },
        },
        transactions: {
            limit: {
                default: parseEnvInt({
                    key: "PAGINATION_TRANSACTIONS_LIMIT_DEFAULT", defaultValue: 10 
                }),
                min: parseEnvInt({
                    key: "PAGINATION_TRANSACTIONS_LIMIT_MIN", defaultValue: 10 
                }),
                max: parseEnvInt({
                    key: "PAGINATION_TRANSACTIONS_LIMIT_MAX", defaultValue: 10 
                }),
            },
            pageNumber: {
                default: parseEnvInt({
                    key: "PAGINATION_TRANSACTIONS_PAGE_NUMBER_DEFAULT", defaultValue: 10 
                }),
                max: parseEnvInt({
                    key: "PAGINATION_TRANSACTIONS_PAGE_NUMBER_MAX", defaultValue: 100 
                }),
            },
        },
        liquidityPools: {
            limit: {
                default: parseEnvInt({
                    key: "PAGINATION_LIQUIDITY_POOLS_LIMIT_DEFAULT", defaultValue: 20 
                }),
                min: parseEnvInt({
                    key: "PAGINATION_LIQUIDITY_POOLS_LIMIT_MIN", defaultValue: 1 
                }),
                max: parseEnvInt({
                    key: "PAGINATION_LIQUIDITY_POOLS_LIMIT_MAX", defaultValue: 20 
                }),
            },
            pageNumber: {
                default: parseEnvInt({
                    key: "PAGINATION_LIQUIDITY_POOLS_PAGE_NUMBER_DEFAULT", defaultValue: 20 
                }),
                max: parseEnvInt({
                    key: "PAGINATION_LIQUIDITY_POOLS_PAGE_NUMBER_MAX", defaultValue: 20 
                }),
            },
        },
    },
    /** Redis connections: cache, BullMQ, throttler, lock authority, Socket.IO adapter (host, port, password, useCluster). */
    redis: {
        cache: {
            host: parseEnvString({
                key: "REDIS_CACHE_HOST", defaultValue: "localhost" 
            }),
            port: parseEnvInt({
                key: "REDIS_CACHE_PORT", defaultValue: 6379 
            }),
            password: parseEnvString({
                key: "REDIS_CACHE_PASSWORD", defaultValue: "Cuong123_A" 
            }),
            useCluster: parseEnvBoolean({
                key: "REDIS_CACHE_USE_CLUSTER", defaultValue: false 
            }),
        },
        bullmq: {
            host: parseEnvString({
                key: "REDIS_BULLMQ_HOST", defaultValue: "localhost" 
            }),
            port: parseEnvInt({
                key: "REDIS_BULLMQ_PORT", defaultValue: 6379 
            }),
            password: parseEnvString({
                key: "REDIS_BULLMQ_PASSWORD", defaultValue: "Cuong123_A" 
            }),
            useCluster: parseEnvBoolean({
                key: "REDIS_BULLMQ_USE_CLUSTER", defaultValue: false 
            }),
        },
        throttler: {
            host: parseEnvString({
                key: "REDIS_THROTTLER_HOST", defaultValue: "localhost" 
            }),
            port: parseEnvInt({
                key: "REDIS_THROTTLER_PORT", defaultValue: 6379 
            }),
            password: parseEnvString({
                key: "REDIS_THROTTLER_PASSWORD", defaultValue: "Cuong123_A" 
            }),
            useCluster: parseEnvBoolean({
                key: "REDIS_THROTTLER_USE_CLUSTER", defaultValue: false 
            }),
        },
        lockAuthority: {
            host: parseEnvString({
                key: "REDIS_LOCK_AUTHORITY_HOST", defaultValue: "localhost" 
            }),
            port: parseEnvInt({
                key: "REDIS_LOCK_AUTHORITY_PORT", defaultValue: 6379 
            }),
            password: parseEnvString({
                key: "REDIS_LOCK_AUTHORITY_PASSWORD", defaultValue: "Cuong123_A" 
            }),
            useCluster: parseEnvBoolean({
                key: "REDIS_LOCK_AUTHORITY_USE_CLUSTER", defaultValue: false 
            }),
        },
        adapter: {
            host: parseEnvString({
                key: "REDIS_ADAPTER_HOST", defaultValue: "localhost" 
            }),
            port: parseEnvInt({
                key: "REDIS_ADAPTER_PORT", defaultValue: 6379 
            }),
            password: parseEnvString({
                key: "REDIS_ADAPTER_PASSWORD", defaultValue: "Cuong123_A" 
            }),
            useCluster: parseEnvBoolean({
                key: "REDIS_ADAPTER_USE_CLUSTER", defaultValue: false 
            }),
        },
    },
    /** Databases: primary MongoDB (host, port, username, password, dbName). */
    databases: {
        mongoose: {
            primary: {
                host: parseEnvString({
                    key: "PRIMARY_MONGO_DB_HOST", defaultValue: "localhost" 
                }),
                port: parseEnvInt({
                    key: "PRIMARY_MONGO_DB_PORT", defaultValue: 27018 
                }),
                password: parseEnvString({
                    key: "PRIMARY_MONGO_DB_PASSWORD", defaultValue: "Cuong123_A" 
                }),
                username: parseEnvString({
                    key: "PRIMARY_MONGO_DB_USERNAME", defaultValue: "root" 
                }),
                dbName: parseEnvString({
                    key: "PRIMARY_MONGO_DB_NAME", defaultValue: "cicore" 
                }),
                manualSeed: parseEnvBoolean({
                    key: "PRIMARY_MONGO_DB_MANUAL_SEED", defaultValue: false 
                }),
                manualLoad: parseEnvBoolean({
                    key: "PRIMARY_MONGO_DB_MANUAL_LOAD", defaultValue: false 
                }),
                maxAwaitTimeMS: parseEnvMs({
                    key: "PRIMARY_MONGO_DB_MAX_AWAIT_TIME_MS", defaultValue: "30s" 
                }),
            },
        },
    },
    /** Consul HTTP API: base URL for KV, health, catalog, etc. */
    consul: {
        // Consul host
        host: parseEnvString({
            key: "CONSUL_HOST", defaultValue: "http://localhost:8500",
        }),
        // Service URL
        serviceUrl: parseEnvString({
            key: "CONSUL_SERVICE_URL",
            defaultValue: "http://localhost:3000"
        }),
        register: {
            // Interval for Consul service registration
            interval: parseEnvMs({
                key: "CONSUL_REGISTER_INTERVAL",
                defaultValue: "10s"
            }),
        },
    },
    /** Prometheus: service registration for DNS discovery. */
    prometheus: {
        metrics: {
            /** Interval for Prometheus metrics. */
            interval: parseEnvString({
                key: "PROMETHEUS_METRICS_INTERVAL", defaultValue: "10s" 
            }),
        },
    },
    /** Loki log aggregation: host, optional auth (username, password). */
    loki: {
        host: parseEnvString({
            key: "LOKI_HOST", defaultValue: "http://localhost:3100" 
        }),
        requireAuth: parseEnvBoolean({
            key: "LOKI_REQUIRE_AUTH", defaultValue: false 
        }),
        username: parseEnvString({
            key: "LOKI_USERNAME", defaultValue: "" 
        }),
        password: parseEnvString({
            key: "LOKI_PASSWORD", defaultValue: "" 
        }),
    },
    /** History: number of series (data points) to keep per history. */
    history: {
        serieCount: parseEnvInt({
            key: "HISTORY_SERIE_COUNT", defaultValue: 5000 
        }),
    },
    /** File paths: data restore/backup, Terraform secrets (API keys, GCP, Privy), app/rpcs config. */
    mountPath: {
        data: {
            restore: parseEnvString({
                key: "DATA_RESTORE_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "data",
                    "restore"),
            }),
            backup: parseEnvString({
                key: "DATA_BACKUP_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "data",
                    "backup"),
            }),
        },
        terraform: {
            coinMarketCapApiKey: parseEnvString({
                key: "TERRAFORM_COIN_MARKET_CAP_API_KEY_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "terraform",
                    "coinmarketcap-api.key"),
            }),
            encryptedAesKey: parseEnvString({
                key: "TERRAFORM_ENCRYPTED_AES_KEY_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "terraform",
                    "encrypted-aes.key"),
            }),
            encryptedJwtSecretKey: parseEnvString({
                key: "TERRAFORM_ENCRYPTED_JWT_SECRET_KEY_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "terraform",
                    "encrypted-jwt-secret.key"),
            }),
            gcpCryptoKeyEdSa: parseEnvString({
                key: "TERRAFORM_GCP_CRYPTO_KEY_ED_SA_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "terraform",
                    "gcp-crypto-key-ed-sa.json"),
            }),
            gcpGoogleDriveUdSa: parseEnvString({
                key: "TERRAFORM_GCP_GOOGLE_DRIVE_UD_SA_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "terraform",
                    "gcp-google-drive-ud-sa.json"),
            }),
            gcpCloudKmsCryptoOperatorSa: parseEnvString({
                key: "TERRAFORM_GCP_CLOUD_KMS_CRYPTO_OPERATOR_SA_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "terraform",
                    "gcp-cloud-kms-crypto-operator-sa.json"),
            }),
            privyAppSecretKey: parseEnvString({
                key: "TERRAFORM_PRIVY_APP_SECRET_KEY_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "terraform",
                    "privy-app-secret.key"),
            }),
            privySignerPrivateKey: parseEnvString({
                key: "TERRAFORM_PRIVY_SIGNER_PRIVATE_KEY_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "terraform",
                    "privy-signer-private-key.key"),
            }),
        },
        config: {
            app: parseEnvString({
                key: "CONFIG_APP_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "config",
                    "app.json"),
            }),
            rpcs: parseEnvString({
                key: "CONFIG_RPCS_MOUNT_PATH",
                defaultValue: join(process.cwd(),
                    ".mount",
                    "config",
                    "rpcs.json"),
            }),
        },
    },
    /** JWT: access and refresh token expiration. */
    jwt: {
        accessToken: {
            expiration: parseEnvMs({
                key: "JWT_ACCESS_TOKEN_EXPIRATION", defaultValue: "1h" 
            }),
        },
        refreshToken: {
            expiration: parseEnvMs({
                key: "JWT_REFRESH_TOKEN_EXPIRATION", defaultValue: "1d" 
            }),
        },
    },
    /** RPC: ejection TTL for unhealthy RPC endpoints. */
    rpc: {
        ejection: {
            ttl: parseEnvMs({
                key: "RPCS_EJECTION_TTL", defaultValue: "1h" 
            }),
        }
    },
    /** Kafka: broker, partitions, retention, SASL, retry and heartbeat; used by coordinator/executor. */
    kafka: {
        maxInFlightRequests: parseEnvInt({
            key: "KAFKA_MAX_IN_FLIGHT_REQUESTS", defaultValue: 20 
        }),
        metadataStabilizationDelayMs: parseEnvMs({
            key: "KAFKA_METADATA_STABILIZATION_DELAY_MS", defaultValue: "1s" 
        }),
        kafkaTopicPollIntervalMs: parseEnvMs({
            key: "KAFKA_TOPIC_POLL_INTERVAL_MS", defaultValue: "500ms" 
        }),
        kafkaTopicPollTimeoutMs: parseEnvMs({
            key: "KAFKA_TOPIC_POLL_TIMEOUT_MS", defaultValue: "10s" 
        }),
        resetTopics: parseEnvBoolean({
            key: "KAFKA_RESET_TOPICS", defaultValue: false 
        }),
        heartbeatInterval: parseEnvMs({
            key: "KAFKA_HEARTBEAT_INTERVAL", defaultValue: "3s" 
        }), // 3 seconds
        consumer: {
            retry: {
                retries: parseEnvInt({
                    key: "KAFKA_RETRY_RETRIES", defaultValue: 3 
                }), // 10 retries
                restartOnFailure: parseEnvBoolean({
                    key: "KAFKA_RETRY_RESTART_ON_FAILURE", defaultValue: true 
                }),
                factor: parseEnvFloat({
                    key: "KAFKA_RETRY_FACTOR", defaultValue: 2.0 
                }), // 2x exponential backoff
                maxTimeout: parseEnvMs({
                    key: "KAFKA_RETRY_MAX_TIMEOUT", defaultValue: "30s" 
                }),
            },
            idleTimeout: parseEnvMs({
                key: "KAFKA_CONSUMER_IDLE_TIMEOUT", defaultValue: "30s" 
            }),
        },
        ping: {
            interval: parseEnvMs({
                key: "KAFKA_PING_INTERVAL", defaultValue: "10s" 
            }),
        },
        producer: {
            retry: {
                retries: parseEnvInt({
                    key: "KAFKA_RETRY_RETRIES", defaultValue: Infinity 
                }), // retries when producer is not ready
                restartOnFailure: parseEnvBoolean({
                    key: "KAFKA_RETRY_RESTART_ON_FAILURE", defaultValue: true 
                }),
                factor: parseEnvFloat({
                    key: "KAFKA_RETRY_FACTOR", defaultValue: 2.0 
                }), // 2x exponential backoff
                maxTimeout: parseEnvMs({
                    key: "KAFKA_RETRY_MAX_TIMEOUT", defaultValue: "30s" 
                }),
            },
        },
        numPartitions: parseEnvInt({
            key: "KAFKA_NUM_PARTITIONS", defaultValue: 1 
        }),
        replicationFactor: parseEnvInt({
            key: "KAFKA_REPLICATION_FACTOR", defaultValue: 1 
        }),
        retentionMs: parseEnvMs({
            key: "KAFKA_RETENTION_MS", defaultValue: "1s" 
        }), // 1 second
        cleanupPolicy: parseEnvString({
            key: "KAFKA_CLEANUP_POLICY", defaultValue: "delete" 
        }),
        segmentMs: parseEnvInt({
            key: "KAFKA_SEGMENT_MS", defaultValue: 1000 
        }), // 1 second
        segmentBytes: parseEnvInt({
            key: "KAFKA_SEGMENT_BYTES", defaultValue: 10485760 
        }), // 10 MB
        maxMessageBytes: parseEnvInt({
            key: "KAFKA_MAX_MESSAGE_BYTES", defaultValue: 1024 
        }), // 1 KB
        fileDeleteDelayMs: parseEnvMs({
            key: "KAFKA_FILE_DELETE_DELAY_MS", defaultValue: "1s" 
        }), // 1 second
        host: parseEnvString({
            key: "KAFKA_BROKER_HOST", defaultValue: "localhost" 
        }),
        port: parseEnvInt({
            key: "KAFKA_BROKER_PORT", defaultValue: 9092 
        }),
        sasl: {
            enabled: parseEnvBoolean({
                key: "KAFKA_SASL_ENABLED", defaultValue: false 
            }),
            username: parseEnvString({
                key: "KAFKA_SASL_USERNAME", defaultValue: "" 
            }),
            password: parseEnvString({
                key: "KAFKA_SASL_PASSWORD", defaultValue: "" 
            }),
        },
    },
    /** Salts for derived keys: JWT signing, AES-CBC encryption. */
    salt: {
        jwt: parseEnvString({
            key: "SALT_JWT", defaultValue: "ZsOM7sCx0UemrdC3gsi2q6NRQLb7TCsI" 
        }),
        aesCbc: parseEnvString({
            key: "SALT_AES_CBC", defaultValue: "ZsOM7sCx0UemrdC3gsi2q6NRQLb7TCsI" 
        }),
    },
    /** BullMQ: attempts, delay, concurrency, batch size, lock duration, job counts, timeout, stalled handling. */
    bullmq: {
        attempts: parseEnvInt({
            key: "BULLMQ_ATTEMPTS", defaultValue: 5 
        }),
        delay: parseEnvMs({
            key: "BULLMQ_DELAY", defaultValue: "200ms" 
        }),
        concurrency: parseEnvInt({
            key: "BULLMQ_CONCURRENCY", defaultValue: 1000 
        }),
        batchSize: parseEnvInt({
            key: "BULLMQ_BATCH_SIZE", defaultValue: 1000 
        }),
        lockDuration: parseEnvMs({
            key: "BULLMQ_LOCK_DURATION", defaultValue: "10s" 
        }),
        completedJobCount: parseEnvInt({
            key: "BULLMQ_COMPLETED_JOB_COUNT", defaultValue: 1000 
        }),
        failedJobCount: parseEnvInt({
            key: "BULLMQ_FAILED_JOB_COUNT", defaultValue: 1000 
        }),
        timeout: parseEnvMs({
            key: "BULLMQ_TIMEOUT", defaultValue: "30s" 
        }),
        stalledInterval: parseEnvMs({
            key: "BULLMQ_STALLED_INTERVAL", defaultValue: "10s" 
        }),
        maxStalledCount: parseEnvInt({
            key: "BULLMQ_MAX_STALLED_COUNT", defaultValue: 1 
        }),
    },
    /** Kubernetes: executor pod (namespace, image, probes, replicas, resources, node pool, env ConfigMap/Secret). */
    k8s: {
        /** Global: common settings for all services. */
        global: {
            /** Pod namespace. */
            podNamespace: parseEnvString(
                {
                    key: "POD_NAMESPACE", 
                    defaultValue: "default" 
                }
            ),
            /** Pod name. */
            podName: parseEnvString(
                {
                    key: "POD_NAME", 
                    defaultValue: "emiuacuong" 
                }
            ),
            /** Pod IP. */
            podIp: parseEnvString(
                {
                    key: "POD_IP", 
                    defaultValue: "localhost" 
                }
            ),
        },
        /** Executor: namespace for executor service. */
        executor: {
            image: parseEnvString({
                key: "KANI_EXECUTOR_IMAGE", defaultValue: "nginx:alpine" 
            }),
            probes: {
                liveness: {
                    failureThreshold: parseEnvInt({
                        key: "KANI_EXECUTOR_PROBES_LIVENESS_FAILURE_THRESHOLD", defaultValue: 3 
                    }),
                    httpGet: {
                        path: parseEnvString({
                            key: "KANI_EXECUTOR_PROBES_LIVENESS_PATH", defaultValue: "/api/terminus/liveness" 
                        }),
                        port: parseEnvString({
                            key: "KANI_EXECUTOR_PROBES_LIVENESS_PORT", defaultValue: "app" 
                        }),
                        scheme: parseEnvString({
                            key: "KANI_EXECUTOR_PROBES_LIVENESS_SCHEME", defaultValue: "HTTP" 
                        }),
                    },
                    initialDelaySeconds: parseEnvSecond({
                        key: "KANI_EXECUTOR_PROBES_LIVENESS_INITIAL_DELAY_SECONDS", defaultValue: "60s" 
                    }),
                    periodSeconds: parseEnvSecond({
                        key: "KANI_EXECUTOR_PROBES_LIVENESS_PERIOD_SECONDS", defaultValue: "60s" 
                    }),
                    successThreshold: parseEnvInt({
                        key: "KANI_EXECUTOR_PROBES_LIVENESS_SUCCESS_THRESHOLD", defaultValue: 1 
                    }),
                    timeoutSeconds: parseEnvSecond({
                        key: "KANI_EXECUTOR_PROBES_LIVENESS_TIMEOUT_SECONDS", defaultValue: "30s" 
                    }),
                },
                readiness: {
                    failureThreshold: parseEnvInt({
                        key: "KANI_EXECUTOR_PROBES_READINESS_FAILURE_THRESHOLD", defaultValue: 3 
                    }),
                    httpGet: {
                        path: parseEnvString({
                            key: "KANI_EXECUTOR_PROBES_READINESS_PATH", defaultValue: "/api/terminus/readiness" 
                        }),
                        port: parseEnvString({
                            key: "KANI_EXECUTOR_PROBES_READINESS_PORT", defaultValue: "app" 
                        }),
                        scheme: parseEnvString({
                            key: "KANI_EXECUTOR_PROBES_READINESS_SCHEME", defaultValue: "HTTP" 
                        }),
                    },
                    initialDelaySeconds: parseEnvSecond({
                        key: "KANI_EXECUTOR_PROBES_READINESS_INITIAL_DELAY_SECONDS", defaultValue: "60s" 
                    }),
                    periodSeconds: parseEnvSecond({
                        key: "KANI_EXECUTOR_PROBES_READINESS_PERIOD_SECONDS", defaultValue: "120s" 
                    }),
                    successThreshold: parseEnvInt({
                        key: "KANI_EXECUTOR_PROBES_READINESS_SUCCESS_THRESHOLD", defaultValue: 1 
                    }),
                    timeoutSeconds: parseEnvSecond({
                        key: "KANI_EXECUTOR_PROBES_READINESS_TIMEOUT_SECONDS", defaultValue: "30s" 
                    }),
                },
                startup: {
                    failureThreshold: parseEnvInt({
                        key: "KANI_EXECUTOR_PROBES_STARTUP_FAILURE_THRESHOLD", defaultValue: 3 
                    }),
                    httpGet: {
                        path: parseEnvString({
                            key: "KANI_EXECUTOR_PROBES_STARTUP_PATH", defaultValue: "/api/terminus/startup" 
                        }),
                        port: parseEnvString({
                            key: "KANI_EXECUTOR_PROBES_STARTUP_PORT", defaultValue: "app" 
                        }),
                        scheme: parseEnvString({
                            key: "KANI_EXECUTOR_PROBES_STARTUP_SCHEME", defaultValue: "HTTP" 
                        }),
                    },
                    initialDelaySeconds: parseEnvSecond({
                        key: "KANI_EXECUTOR_PROBES_STARTUP_INITIAL_DELAY_SECONDS", defaultValue: "60s" 
                    }),
                    periodSeconds: parseEnvSecond({
                        key: "KANI_EXECUTOR_PROBES_STARTUP_PERIOD_SECONDS", defaultValue: "120s" 
                    }),
                    successThreshold: parseEnvInt({
                        key: "KANI_EXECUTOR_PROBES_STARTUP_SUCCESS_THRESHOLD", defaultValue: 1 
                    }),
                    timeoutSeconds: parseEnvSecond({
                        key: "KANI_EXECUTOR_PROBES_STARTUP_TIMEOUT_SECONDS", defaultValue: "30s" 
                    }),
                }
            },
            replicas: parseEnvInt({
                key: "KANI_EXECUTOR_REPLICAS", defaultValue: 1 
            }),
            envVarsConfigMapName: parseEnvString({
                key: "KANI_EXECUTOR_ENV_VARS_CONFIG_MAP_NAME", defaultValue: "kani-executor-service-env-vars" 
            }),
            envVarsSecretName: parseEnvString({
                key: "KANI_EXECUTOR_ENV_VARS_SECRET_NAME", defaultValue: "kani-executor-service-env-vars" 
            }),
            resources: {
                limits: {
                    cpu: parseEnvString({
                        key: "KANI_EXECUTOR_RESOURCES_LIMITS_CPU", defaultValue: "512m" 
                    }),
                    memory: parseEnvString({
                        key: "KANI_EXECUTOR_RESOURCES_LIMITS_MEMORY", defaultValue: "1Gi" 
                    }),
                },
                requests: {
                    cpu: parseEnvString({
                        key: "KANI_EXECUTOR_RESOURCES_REQUESTS_CPU", defaultValue: "64m" 
                    }),
                    memory: parseEnvString({
                        key: "KANI_EXECUTOR_RESOURCES_REQUESTS_MEMORY", defaultValue: "128Mi" 
                    }),
                },
            },
            nodePool: parseEnvString({
                key: "KANI_EXECUTOR_NODE_POOL", defaultValue: "kani-primary-node-pool" 
            }),
        },
    },
    /** Resource thresholds: RAM (bytes) and disk (percent) for health/alerting. */
    resources: {
        ram: {
            threadhold: parseEnvInt({
                key: "RAM_ALLOCATION_THRESHOLD",
                defaultValue: bytes("1GB") as number
            }),
        }, 
        disk: {
            threadholdPercent: parseEnvFloat({
                key: "DISK_ALLOCATION_THRESHOLD", defaultValue: 1 
            }), 
        },
    },
    /** Service listen ports: interface, coordinator, executor, observer, inspector, etc. */
    ports: {
        /** Global port: used for common services like Prometheus, Grafana, etc. */
        global: parseEnvInt({
            key: "KANI_GLOBAL_PORT", defaultValue: 3000 
        }),
        kaniInterface: parseEnvInt({
            key: "KANI_INTERFACE_PORT", defaultValue: 3001 
        }),
        kaniCoordinator: parseEnvInt({
            key: "KANI_COORDINATOR_PORT", defaultValue: 3002 
        }),
        kaniExecutor: parseEnvInt({
            key: "KANI_EXECUTOR_PORT", defaultValue: 3003 
        }),
        botCoordinator: parseEnvInt({
            key: "BOT_COORDINATOR_PORT", defaultValue: 3002 
        }),
        botExecutor: parseEnvInt({
            key: "BOT_EXECUTOR_PORT", defaultValue: 3004 
        }),
        kaniObserver: parseEnvInt({
            key: "KANI_OBSERVER_PORT", defaultValue: 3005 
        }),
        kaniInspector: parseEnvInt({
            key: "KANI_INSPECTOR_PORT", defaultValue: 3006 
        }),
    },
    /** CORS: allowed origins (CORS_ORIGIN_1 … CORS_ORIGIN_10, empty skipped). */
    cors: {
        origins: Array.from({
            length: 10 
        },
        (_, i) =>
            parseEnvString({
                key: `CORS_ORIGIN_${i + 1}`,
                defaultValue: ""
            }),
        ).filter((url) => url !== ""),
    },
    /** Coordinator: version, MongoDB change stream timeout, load interval. */
    coordinator: {
        version: parseEnvString({
            key: "COORDINATOR_VERSION", defaultValue: "1" 
        }),
        streams: {
            mongoDbChangeStream: {
                timeout: parseEnvMs({
                    key: "COORDINATOR_STREAMS_MONGO_DB_CHANGE_STREAM_TIMEOUT",
                    defaultValue: "30m"
                }),
            },
        },
        interval: {
            load: parseEnvMs({
                key: "COORDINATOR_INTERVAL_LOAD", defaultValue: "5s" 
            }),
        }
    },
})
