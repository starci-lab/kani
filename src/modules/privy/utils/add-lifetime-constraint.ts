import type {
    TransactionBlockhashLifetime
} from "@solana/kit"
import type {
    FullySolanaTransaction,
    NonReadOnlySolanaTransaction,
    SolanaTransaction
} from "../types"

/** Params for adding blockhash lifetime to a Solana transaction. */
export interface AddLifetimeConstraintParams {
    transaction: SolanaTransaction
    lifetimeConstraint: TransactionBlockhashLifetime
}

/**
 * Mutates transaction with lifetime constraint and returns as FullySolanaTransaction.
 */
export const addLifetimeConstraint = (
    params: AddLifetimeConstraintParams,
): FullySolanaTransaction => {
    const { transaction, lifetimeConstraint } = params
    const tx = transaction as unknown as NonReadOnlySolanaTransaction
    tx.lifetimeConstraint = lifetimeConstraint
    return tx as FullySolanaTransaction
}
