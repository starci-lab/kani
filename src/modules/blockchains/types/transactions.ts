import {
    FullySignedTransaction, 
    TransactionWithinSizeLimit, 
    TransactionWithBlockhashLifetime, 
    TransactionMessageBytes, 
    SignaturesMap
} from "@solana/kit"
import {
    ChainId 
} from "@modules/common"

/** Solana transaction type with all required properties. */
export type SolanaTx = FullySignedTransaction & Readonly<TransactionWithinSizeLimit & TransactionWithBlockhashLifetime & Readonly<{
    messageBytes: TransactionMessageBytes;
    signatures: SignaturesMap;
}>>

/** Prepared transaction data for execution. */
export interface SignedTx {
    /** Transaction hash. */
    txHash: string
    /** Solana transaction. */
    signedSerializedTx: string
    /** Chain ID. */
    chainId: ChainId
}

/** Prepared transaction data for execution. */
export interface PrepareTx {
    /** Chain ID. */
    chainId: ChainId
    /** Serialized transaction. */
    serializedTx: string
}