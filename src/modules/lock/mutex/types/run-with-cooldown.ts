/** Params for running a callback under mutex with cooldown after. */
export interface RunWithCooldownParams<T = unknown> {
    key: string
    callback: () => Promise<T>
    onError?: (error: Error) => void
    timeout: number
}

/** Result of run with cooldown (void). */
export type RunWithCooldownResult = void
