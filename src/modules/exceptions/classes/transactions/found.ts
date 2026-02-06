import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    LiquidityPoolId 
} from "@modules/databases"
import type {
    ErrorTransactionType 
} from "./types"

/** Metadata when transaction is not found in blockchain. */
export interface TransactionNotFoundInBlockchainExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId?: LiquidityPoolId
    type: ErrorTransactionType
}

/** Thrown when transaction is not found in blockchain. */
export class TransactionNotFoundInBlockchainException extends AbstractException {
    constructor(
        { botId, txHash, liquidityPoolId, type }: TransactionNotFoundInBlockchainExceptionMetadata
    ) {
        super("Transaction not found in blockchain",
            "TRANSACTION_NOT_FOUND_IN_BLOCKCHAIN",
            {
                botId,
                txHash,
                liquidityPoolId,
                type,
            })
    }
}