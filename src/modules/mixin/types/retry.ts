import type {
    Options
} from "p-retry"

/** Params for retrying an action. */
export interface RetryParams<T> {
    action: () => Promise<T> | T
    options?: RetryOptions
}

/** Retry options (p-retry). */
export type RetryOptions = Options
