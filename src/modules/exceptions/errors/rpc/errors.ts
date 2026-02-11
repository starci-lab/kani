/**
 * RPC layer exceptions (Solana / Sui).
 * Used by RpcExecutorService to classify and propagate retryable / fatal / ignorable errors.
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Solana RPC: temporary failure, safe to retry with backoff */
export class SolanaRpcRetryableException extends AbstractException {
    constructor(message?: string, metadata?: AbstractExceptionMetadata) {
        super(
            message ?? "Solana RPC retryable error",
            "SOLANA_RPC_RETRYABLE_EXCEPTION",
            {
                ...metadata,
            },
        )
    }
}

/** Solana RPC: permanent failure, do not retry; eject RPC */
export class SolanaRpcFatalException extends AbstractException {
    constructor(message?: string, metadata?: AbstractExceptionMetadata) {
        super(
            message ?? "Solana RPC fatal error",
            "SOLANA_RPC_FATAL_EXCEPTION",
            {
                ...metadata,
            },
        )
    }
}

/** Solana RPC: ignorable (e.g. rate limit); retry without ejecting */
export class SolanaRpcIgnorableException extends AbstractException {
    constructor(message?: string, metadata?: AbstractExceptionMetadata) {
        super(
            message ?? "Solana RPC ignorable error",
            "SOLANA_RPC_IGNORABLE_EXCEPTION",
            {
                ...metadata,
            },
        )
    }
}

/** Solana RPC: transaction submit failed, do not retry; eject RPC */
export interface TransactionSubmitFailedExceptionMetadata extends AbstractExceptionMetadata {
    message: string
}
export class TransactionSubmitFailedException extends AbstractException {
    constructor({ message, originalError}: TransactionSubmitFailedExceptionMetadata) {
        super("Transaction submit failed error",
            "TRANSACTION_SUBMIT_FAILED_EXCEPTION",
            {
                message, 
                originalError 
            }
        )
    }
}

/** Sui RPC: temporary failure, safe to retry with backoff */
export class SuiRpcRetryableException extends AbstractException {
    constructor(message?: string, metadata?: AbstractExceptionMetadata) {
        super(
            message ?? "Sui RPC retryable error",
            "SUI_RPC_RETRYABLE_EXCEPTION",
            {
                ...metadata,
            },
        )
    }
}

/** Sui RPC: permanent failure, do not retry; eject RPC */
export class SuiRpcFatalException extends AbstractException {
    constructor(message?: string, metadata?: AbstractExceptionMetadata) {
        super(
            message ?? "Sui RPC fatal error",
            "SUI_RPC_FATAL_EXCEPTION",
            {
                ...metadata,
            },
        )
    }
}

/** Sui RPC: ignorable (e.g. rate limit); retry without ejecting */
export class SuiRpcIgnorableException extends AbstractException {
    constructor(message?: string, metadata?: AbstractExceptionMetadata) {
        super(
            message ?? "Sui RPC ignorable error",
            "SUI_RPC_IGNORABLE_EXCEPTION",
            {
                ...metadata,
            },
        )
    }
}
