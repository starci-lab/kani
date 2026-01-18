
import {
    RetryLink 
} from "@apollo/client/link/retry"
import {
    envConfig 
} from "@modules/env"

// retry link
export const createRetryLink = () => {
    return new RetryLink({
        delay: {
            initial: envConfig().client.apollo.retry.initial,
            max: envConfig().client.apollo.retry.max,
            jitter: envConfig().client.apollo.retry.jitter
        },
        attempts: {
            max: envConfig().client.apollo.retry.maxRetries,
            retryIf: (error) => {
                return !!error
            }
        }
    })
}