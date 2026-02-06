import {
    SignatureWithBytes 
} from "@mysten/sui/cryptography"
import {
    FullySignedTransaction, TransactionWithinSizeLimit, TransactionWithBlockhashLifetime, TransactionMessageBytes, SignaturesMap 
} from "@solana/kit"

/** Solana transaction type with all required properties. */
export type SolanaTx = FullySignedTransaction & Readonly<TransactionWithinSizeLimit & TransactionWithBlockhashLifetime & Readonly<{
    messageBytes: TransactionMessageBytes;
    signatures: SignaturesMap;
}>>

/** Prepared transaction data for execution. */
export interface PrepareTx {
    txHash: string
    solanaTx?: SolanaTx
    signatureWithBytes?: SignatureWithBytes
}
