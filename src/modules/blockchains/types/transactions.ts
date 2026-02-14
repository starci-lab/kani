import {
    FullySignedTransaction, 
    TransactionWithinSizeLimit, 
    TransactionWithBlockhashLifetime, 
    TransactionMessageBytes, 
    SignaturesMap,
    ExcludeTransactionMessageWithinSizeLimit,
    TransactionMessageWithFeePayerSigner,
    TransactionSigner,
    Instruction,
    createTransactionMessage,
    AccountMeta,
    AccountLookupMeta,
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
    /** Additional private keys for signing. */
    privateKeys?: Array<string>
}

/** Solana transaction message type with all required properties. */
export type SolanaTxMessage = Omit<
ExcludeTransactionMessageWithinSizeLimit<
Omit<ReturnType<typeof createTransactionMessage<0>>, "feePayer"> 
& TransactionMessageWithFeePayerSigner<string, TransactionSigner<string>>>
, "instructions"> & {
    readonly instructions: readonly Instruction<string, readonly (AccountLookupMeta<string, string> | AccountMeta<string>)[]>[];
}