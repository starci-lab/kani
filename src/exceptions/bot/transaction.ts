import { AbstractException } from "../abstract"
import { LiquidityPoolId } from "@modules/databases"

/** Thrown when transaction validation fails */
export interface TransactionValidationFailedExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}
export class TransactionValidationFailedException extends AbstractException {
    constructor(
        { botId, txHash, liquidityPoolId }: TransactionValidationFailedExceptionMetadata
    ) {
        super(
            "TRANSACTION_VALIDATION_FAILED_EXCEPTION", 
            "TRANSACTION_VALIDATION_FAILED_EXCEPTION", 
            {
                botId,
                txHash,
                liquidityPoolId,
            }
        )
    }
}

/** Thrown when transaction is not found */
export interface TransactionEventNotFoundExceptionMetadata {
    botId: string
    txHash: string
    eventType: string
    liquidityPoolId: LiquidityPoolId
}
export class TransactionEventNotFoundException extends AbstractException {
    constructor(
        { botId, txHash, eventType }: TransactionEventNotFoundExceptionMetadata
    ) {
        super(
            "TRANSACTION_EVENT_NOT_FOUND_EXCEPTION", 
            "TRANSACTION_EVENT_NOT_FOUND_EXCEPTION",  
            {
                botId,
                txHash,
                eventType,
            }
        )
    }
}

/** Thrown when transaction has not been executed */
export interface TransactionNotExecutedExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}
export class TransactionNotExecutedException extends AbstractException {
    constructor(
        { botId, txHash, liquidityPoolId }: TransactionNotExecutedExceptionMetadata
    ) {
        super(
            "TRANSACTION_NOT_EXECUTED_EXCEPTION", 
            "TRANSACTION_NOT_EXECUTED_EXCEPTION", 
            {
                botId,
                txHash,
                liquidityPoolId,
            }
        )
    }
}

/** Thrown when transaction has not been prepared */
export interface TransactionNotPreparedExceptionMetadata {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}
export class TransactionNotPreparedException extends AbstractException {
    constructor(
        { botId, txHash, liquidityPoolId }: TransactionNotPreparedExceptionMetadata
    ) {
        super(
            "TRANSACTION_NOT_PREPARED_EXCEPTION", 
            "TRANSACTION_NOT_PREPARED_EXCEPTION", 
            {
                botId,
                txHash,
                liquidityPoolId,
            }
        )
    }
}