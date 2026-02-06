import {
    sendAndConfirmTransactionFactory, signTransaction 
} from "@solana/kit"

/** Transaction with lifetime type. */
export type TransactionWithLifetime = Parameters<typeof signTransaction>[1]

/** Send and confirm transaction type. */
export type SendAndConfirmTransactionType = Parameters<ReturnType<typeof sendAndConfirmTransactionFactory>>[0]
