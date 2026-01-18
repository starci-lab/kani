import {
    parseMs,
    parseString,
    parseBoolean,
    parseFloat
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
})
