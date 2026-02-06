import {
    RetryLink 
} from "@apollo/client/link/retry"
import {
    envConfig 
} from "@modules/env"

/**
 * Creates a retry link with delay and max attempts from env config.
 *
 * @returns RetryLink instance
 *
 * @example
 * const link = createRetryLink()
 */
export const createRetryLink = () => {
    const config = envConfig().client.apollo.retry

    return new RetryLink({
        delay: {
            initial: config.initial,
            max: config.max,
            jitter: config.jitter,
        },
        attempts: {
            max: config.maxRetries,
            retryIf: (error) => !!error,
        },
    })
}
