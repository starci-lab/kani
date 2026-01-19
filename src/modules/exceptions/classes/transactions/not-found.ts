/**
 * Transaction Not Found Exceptions
 * Errors related to missing transaction events
 */

import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"
import {
    LiquidityPoolId,
} from "@modules/databases"

/** Thrown when transaction event is not found */
export interface TransactionEventNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    eventType: string
    liquidityPoolId: LiquidityPoolId
}

export class TransactionEventNotFoundException extends AbstractException {
    constructor(
        {
            botId,
            txHash,
            eventType,
            originalError,
        }: TransactionEventNotFoundExceptionMetadata
    ) {
        super(
            "Transaction event not found",
            "TRANSACTION_EVENT_NOT_FOUND_EXCEPTION",
            {
                botId,
                txHash,
                eventType,
                originalError,
            }
        )
    }
}
