import { 
    FullySignedTransaction,
    SignaturesMap, 
    TransactionBlockhashLifetime, 
    TransactionMessageBytes, 
    TransactionWithBlockhashLifetime, 
    TransactionWithinSizeLimit
} from "@solana/kit"

export type SolanaTransaction = Readonly<{
    messageBytes: TransactionMessageBytes;
    signatures: SignaturesMap;
}>

export type NonReadOnlySolanaTransaction = FullySignedTransaction & TransactionWithinSizeLimit & {
    messageBytes: TransactionMessageBytes;
    signatures: SignaturesMap;
} & {
    lifetimeConstraint: TransactionBlockhashLifetime;
}

export type FullySolanaTransaction = FullySignedTransaction & TransactionWithinSizeLimit & Readonly<{
    messageBytes: TransactionMessageBytes;
    signatures: SignaturesMap;
}> & TransactionWithBlockhashLifetime & {
    lifetimeConstraint: TransactionBlockhashLifetime;
}