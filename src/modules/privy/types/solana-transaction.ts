import type {
    SignaturesMap,
    TransactionMessageBytes
} from "@solana/kit"
import type {
    FullySignedTransaction,
    TransactionBlockhashLifetime,
    TransactionWithBlockhashLifetime,
    TransactionWithinSizeLimit
} from "@solana/kit"

/** Read-only Solana transaction shape. */
export type SolanaTransaction = Readonly<{
    messageBytes: TransactionMessageBytes
    signatures: SignaturesMap
}>

/** Mutable Solana transaction (for adding lifetime). */
export type NonReadOnlySolanaTransaction = FullySignedTransaction &
    TransactionWithinSizeLimit & {
        messageBytes: TransactionMessageBytes
        signatures: SignaturesMap
    } & {
        lifetimeConstraint: TransactionBlockhashLifetime
    }

/** Fully valid Solana transaction with blockhash lifetime. */
export type FullySolanaTransaction = FullySignedTransaction &
    TransactionWithinSizeLimit &
    Readonly<{
        messageBytes: TransactionMessageBytes
        signatures: SignaturesMap
    }> &
    TransactionWithBlockhashLifetime & {
        lifetimeConstraint: TransactionBlockhashLifetime
    }
