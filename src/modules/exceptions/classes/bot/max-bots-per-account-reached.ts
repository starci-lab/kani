import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when user has reached the maximum number of bots per account */
export interface MaxBotsPerAccountReachedExceptionMetadata extends AbstractExceptionMetadata {
    userId: string
    maxBotsPerAccount: number
}
export class MaxBotsPerAccountReachedException extends AbstractException {
    constructor(
        { userId, maxBotsPerAccount, originalError }: MaxBotsPerAccountReachedExceptionMetadata
    ) {
        super("Max bots per account reached",
            "MAX_BOTS_PER_ACCOUNT_REACHED_EXCEPTION",
            {
                userId, maxBotsPerAccount, originalError 
            })
    }
}
