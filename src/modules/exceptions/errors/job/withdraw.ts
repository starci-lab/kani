import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Metadata for withdraw cache result not found. */
export interface WithdrawCacheResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}

/** Thrown when withdraw cache result not found. */
export class WithdrawCacheResultNotFoundException extends AbstractException {
    constructor(
        {
            botId,
        }: WithdrawCacheResultNotFoundExceptionMetadata
    ) {
        super(
            "Withdraw cache result not found",
            "WITHDRAW_CACHE_RESULT_NOT_FOUND_EXCEPTION",
            {
                botId,
            }
        )
    }
}