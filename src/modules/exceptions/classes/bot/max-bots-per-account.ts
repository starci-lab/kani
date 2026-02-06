import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when the maximum number of bots per account has been reached */
export interface MaxBotsPerAccountReachedExceptionMetadata extends AbstractExceptionMetadata {
    userId: string
    maxBotsPerAccount: number
}

export class MaxBotsPerAccountReachedException extends AbstractException {
    constructor(
        { userId, maxBotsPerAccount, originalError }: MaxBotsPerAccountReachedExceptionMetadata
    ) {
        super(
            "Maximum number of bots per account reached",
            "MAX_BOTS_PER_ACCOUNT_REACHED_EXCEPTION",
            {
                userId,
                maxBotsPerAccount,
                originalError 
            }
        )
    }
}
