/**
 * Transaction signing exceptions.
 * Errors related to transaction signing.
 */

import type {
    AbstractExceptionMetadata
} from "../abstract"
import {
    AbstractException
} from "../abstract"
import type {
    TransactionType,
    LiquidityPoolId
} from "@modules/databases"
import type {
    ChainId
} from "@modules/common"

/** Thrown when transaction signing fails. */
export interface TransactionSignedFailedExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    chainId: ChainId
    liquidityPoolId?: LiquidityPoolId
    type: TransactionType
}

/** Thrown when transaction signing fails. */
export class TransactionSignedFailedException extends AbstractException {
    constructor(
        {
            botId,
            chainId,
            liquidityPoolId,
            type,
            originalError,
        }: TransactionSignedFailedExceptionMetadata
    ) {
        super(
            "Transaction signing failed",
            "TRANSACTION_SIGNED_FAILED_EXCEPTION",
            {
                botId,
                chainId,
                liquidityPoolId,
                type,
                originalError,
            }
        )
    }
}

