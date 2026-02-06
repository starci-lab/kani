/**
 * Transaction not-found exceptions.
 * Errors related to missing transaction events.
 */

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

/** Thrown when transaction event is not found */
export interface TransactionEventNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    txHash: string
    eventType: string
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when transaction event is not found. */
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

/** Thrown when output coin is not found after swap */
export interface OutputCoinNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    type: ErrorTransactionType
}

/** Thrown when output coin is not found after swap. */
export class OutputCoinNotFoundException extends AbstractException {
    constructor({
        botId,
        type,
        originalError,
    }: OutputCoinNotFoundExceptionMetadata) {
        super(
            "Output coin not found",
            "OUTPUT_COIN_NOT_FOUND_EXCEPTION",
            {
                botId,
                type,
                originalError,
            },
        )
    }
}
