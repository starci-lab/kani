import type {
    SignatureWithBytes
} from "@mysten/sui/cryptography"
import type {
    SuiClient
} from "@mysten/sui/client"
import type {
    Transaction
} from "@mysten/sui/transactions"
import type {
    EncryptedPayload
} from "@modules/crypto"
import type {
    TransactionBlockhashLifetime
} from "@solana/kit"
import type {
    FullySolanaTransaction,
    SolanaTransaction
} from "./solana-transaction"

/** Base params for sign transaction. */
export interface SignTransactionParams<T> {
    walletId: string
    transaction: T
    encryptedPrivySignerPrivateKey: EncryptedPayload
}

/** Params for signing a Solana transaction. */
export interface SignSolanaTransactionParams
    extends SignTransactionParams<SolanaTransaction> {
    lifetimeConstraint: TransactionBlockhashLifetime
}

/** Params for signing a Sui transaction. */
export interface SignSuiTransactionParams
    extends SignTransactionParams<Transaction> {
    publicKeyHex: string
    client: SuiClient
}

/** Result of signSuiTransaction. */
export interface SignSuiTransactionResult {
    txHash: string
    signatureWithBytes: SignatureWithBytes
}

/** Result of signSolanaTransaction. */
export interface SignSolanaTransactionResult {
    signedTransaction: FullySolanaTransaction
    txHash: string
}
