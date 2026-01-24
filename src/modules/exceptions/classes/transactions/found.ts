import {
    ErrorTransactionType 
} from "./types"
import {
    LiquidityPoolId 
} from "@modules/databases"
import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

export interface TransactionNotFoundInBlockchainExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId?: LiquidityPoolId
    type: ErrorTransactionType
}

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