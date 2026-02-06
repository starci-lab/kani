/** Params for wait (poll until condition or max attempts). */
export interface WaitParams {
    action: () => Promise<boolean> | boolean
    maxAttempts?: number
    intervalMs?: number
    throwOnFail?: boolean
}
