import { FullySolanaTransaction, NonReadOnlySolanaTransaction, SolanaTransaction } from "./types"
import { TransactionBlockhashLifetime } from "@solana/kit"

export const addLifetimeConstraint = (transaction: SolanaTransaction, lifetimeConstraint: TransactionBlockhashLifetime): FullySolanaTransaction => {
    const tx = transaction as unknown as NonReadOnlySolanaTransaction
    tx.lifetimeConstraint = lifetimeConstraint
    return tx as FullySolanaTransaction
}