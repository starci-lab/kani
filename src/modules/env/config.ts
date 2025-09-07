import { ChainId, Network } from "@modules/common"
import { v4 } from "uuid"
import { join } from "path"

export enum LpBotType {
    System = "system",       // bot self run, use own key
    UserBased = "user-based" // bot get user from DB to run
  }

export const envConfig = () => ({
    isProduction: process.env.NODE_ENV === "production",
    frontend: {
        url: process.env.FRONTEND_URL || "http://localhost:3000/callback/google",
    },
    coinMarketCap: {
        apiKey: process.env.COIN_MARKET_CAP_API_KEY || "",
    },
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD || "Cuong123_A",
        ttl: parseInt(process.env.REDIS_TTL || "3600000", 10), // 3600s
    },
    databases: {
        mongoose: {
            host: process.env.MONGOOSE_HOST || "localhost",
            port: parseInt(process.env.MONGOOSE_PORT || "27018", 10),
            password: process.env.MONGOOSE_PASSWORD || "Cuong123_A",
            username: process.env.MONGOOSE_USERNAME || "root",
            dbName: process.env.MONGOOSE_DB_NAME || "cicore",
        },
    },
    volume: {
        data: {
            path: process.env.VOLUME_DATA_PATH || join(process.cwd(), ".volume", "data"),
        },
    },
    deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY || "",
        apiUrl: process.env.DEEPSEEK_API_URL || "https://api.deepseek.ai/v1/analyze",
    },
    debug: {
        kaminoVaultFetch: Boolean(process.env.KAMINO_VAULT_FETCH_DEBUG) || true,
    },
    cryptography: {
        sha256Salt: process.env.SHA256_SALT || "ciswipesha256",
    },
    loki: {
        host: process.env.LOKI_HOST || "http://localhost:3100",
        requireAuth: Boolean(process.env.LOKI_REQUIRE_AUTH) || false,
        username: process.env.LOKI_USERNAME,
        password: process.env.LOKI_PASSWORD,
    },
    crypto: {
        cipher: {
            secret: process.env.CIPHER_SECRET || "Cuong123_A",
        },
        bcrypt: {
            salt: process.env.BCRYPT_SALT || "Cuong123_A",
        },
    },
    googleCloud: {
        oauth: {
            clientId: process.env.GOOGLE_CLOUD_OAUTH_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLOUD_OAUTH_CLIENT_SECRET || "",
            redirectUri: process.env.GOOGLE_CLOUD_OAUTH_REDIRECT_URI || "",
        },
        kms: {
            keyName: process.env.GOOGLE_CLOUD_KMS_KEY_NAME || "",
        },
        secret: {
            secretName: process.env.GOOGLE_CLOUD_SECRET_NAME || "",
        },
    },
    jwt: {
        secret: process.env.JWT_SECRET || "",
        accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || "1h",
        refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || "7d",
    },
    rpcs: {
        [ChainId.Sui]: {
            [Network.Mainnet]: process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io:443",
            [Network.Testnet]: process.env.SUI_RPC_URL_TESTNET || "https://fullnode.testnet.sui.io:443",
        },
        [ChainId.Solana]: {
            [Network.Mainnet]: process.env.SOLANA_RPC_URL || "https://fullnode.mainnet.solana.io:443",
            [Network.Testnet]: process.env.SOLANA_RPC_URL_TESTNET || "https://fullnode.testnet.solana.io:443",
        },
    },
    lpBot: {
        type: process.env.LP_BOT_TYPE || LpBotType.System,
        recordInstanceId: process.env.LP_BOT_RECORD_INSTANCE_ID,
        appName: process.env.APP_NAME || "lp-bot",
        enablePriceFetcher: process.env.ENABLE_PRICE_FETCHER || false,
        suiWallet: {
            accountAddress: process.env.LP_BOT_WALLET_ACCOUNT_ADDRESS || "",
            encryptedPrivateKey: process.env.LP_BOT_SUI_WALLET_ENCRYPTED_PRIVATE_KEY || "",
        },
        evmWallet: {
            accountAddress: process.env.LP_BOT_EVM_WALLET_ACCOUNT_ADDRESS || "",
            encryptedPrivateKey: process.env.LP_BOT_EVM_WALLET_ENCRYPTED_PRIVATE_KEY || "",
        },
        solanaWallet: {
            accountAddress: process.env.LP_BOT_SOLANA_WALLET_ACCOUNT_ADDRESS || "",
            encryptedPrivateKey: process.env.LP_BOT_SOLANA_WALLET_ENCRYPTED_PRIVATE_KEY || "",
        }
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
})
