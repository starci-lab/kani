import { v4 } from "uuid"
import { join } from "path"
import ms from "ms"
import Decimal from "decimal.js"

export const envConfig = () => ({
    isProduction: process.env.NODE_ENV === "production",
    port: {
        core: Number(process.env.CORE_PORT) || 3010,
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
    redis: {
        cache: {
            host: process.env.REDIS_CACHE_HOST || "localhost",
            port: parseInt(process.env.REDIS_CACHE_PORT || "6379", 10),
            password: process.env.REDIS_CACHE_PASSWORD || "Cuong123_A",
            ttl: parseInt(process.env.CACHE_CACHE_REDIS_TTL || "3600000", 10), // 3600s
        },
        adapter: {
            host: process.env.REDIS_ADAPTER_HOST || "localhost",
            port: parseInt(process.env.REDIS_ADAPTER_PORT || "6379", 10),
            password: process.env.REDIS_ADAPTER_PASSWORD || "Cuong123_A",
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
        }
    },
    gcp: {
        kms: {
            keyName: process.env.GCP_KMS_KEY_NAME || "projects/kani-473603/locations/global/keyRings/kani-crypto-keyring/cryptoKeys/kani-crypto-key",
        },
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
        apiKeys: {
            smtp: process.env.SMTP_MOUNT_PATH || join(process.cwd(), ".mount", "api-keys", "smtp.json"),
        },
    },
    interval: {
        poolStateUpdate: parseInt(process.env.INTERVAL_POOL_STATE_UPDATE || "10000", 10), // 10s
        suiPoolStateUpdate: parseInt(process.env.INTERVAL_SUI_POOL_STATE_UPDATE || "1000", 10), // 1s
        analytics: parseInt(process.env.INTERVAL_ANALYTICS || "30000", 10), // 30s
    },
    lockCooldown: {
        openPosition: parseInt(process.env.LOCK_COOLDOWN_OPEN_POSITION || "10000", 10), // 10s
        closePosition: parseInt(process.env.LOCK_COOLDOWN_CLOSE_POSITION || "10000", 10), // 10s
        rebalancing: parseInt(process.env.LOCK_COOLDOWN_REBALANCING || "5000", 10), // 5s
    },
    bullmq: {
        completedJobCount: parseInt(process.env.BULLMQ_COMPLETED_JOB_COUNT || "1000", 10),
        failedJobCount: parseInt(process.env.BULLMQ_FAILED_JOB_COUNT || "1000", 10),
    },
    cors: {
        origins: Array.from({ length: 10 }, (_, i) =>
            process.env[`CORS_ORIGIN_${i + 1}`] || ""
        ).filter((url) => url !== ""),
    },
    kafka: {
        clientId: process.env.KAFKA_CLIENT_ID || v4(),
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
    botExecutor: {
        batchId: process.env.BOX_EXECUTOR_BATCH_ID ? parseInt(process.env.BOX_EXECUTOR_BATCH_ID, 10) : 0,
        balanceEvaluationInterval: process.env.BOT_EXECUTOR_BALANCE_EVALUATION_INTERVAL ? parseInt(process.env.BOT_EXECUTOR_BALANCE_EVALUATION_INTERVAL, 10) : 10000,
        activeBotInterval: process.env.BOT_EXECUTOR_ACTIVE_BOT_INTERVAL ? parseInt(process.env.BOT_EXECUTOR_ACTIVE_BOT_INTERVAL, 10) : 10000,
        suiPoolFetchInterval: process.env.BOT_EXECUTOR_SUI_POOL_FETCH_INTERVAL ? parseInt(process.env.BOT_EXECUTOR_SUI_POOL_FETCH_INTERVAL, 10) : 1000,
        transactionCommitInterval: process.env.BOT_EXECUTOR_TRANSACTION_COMMIT_INTERVAL ? parseInt(process.env.BOT_EXECUTOR_TRANSACTION_COMMIT_INTERVAL, 10) : 10000,
    },
    ports: {
        kaniInterface: process.env.KANI_INTERFACE_PORT ? parseInt(process.env.KANI_INTERFACE_PORT, 10) : 3001,
        botCoordinator: process.env.BOT_COORDINATOR_PORT ? parseInt(process.env.BOT_COORDINATOR_PORT, 10) : 3002,
        botExecutor: process.env.BOT_EXECUTOR_PORT ? parseInt(process.env.BOT_EXECUTOR_PORT, 10) : 3003,
        kaniObserver: process.env.KANI_OBSERVER_PORT ? parseInt(process.env.KANI_OBSERVER_PORT, 10) : 3004,
    },
})
