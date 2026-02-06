/**
 * Represents the type of RPC error for error handling strategy.
 */
export enum RpcErrorType {
    /** Error can be ignored (e.g., temporary network issues). */
    Ignorable = "ignorable",
    /** Error should trigger a retry. */
    Retryable = "retryable",
    /** Error is fatal and should not be retried. */
    Fatal = "fatal",
}
