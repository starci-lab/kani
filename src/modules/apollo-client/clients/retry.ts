
import { RetryLink } from "@apollo/client/link/retry"

// retry link
export const createRetryLink = ({ initialRetryDelay = 1000, maxRetryDelay = 10000, maxRetry = 3 }: CreateRetryLinkParams) => {
    return new RetryLink({
        delay: {
            initial: initialRetryDelay,
            max: maxRetryDelay,
            jitter: true
        },
        attempts: {
            max: maxRetry,
            retryIf: (error) => {
                return !!error
            }
        }
    })
}

export interface CreateRetryLinkParams {
    initialRetryDelay?: number
    maxRetryDelay?: number
    maxRetry?: number
}