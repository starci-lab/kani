import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when a bot is not owned by a user */
export interface BotNotOwnedByUserExceptionMetadata extends AbstractExceptionMetadata {
    id: string
    userId: string
}
export class BotNotOwnedByUserException extends AbstractException {
    constructor(
        { id, userId, originalError }: BotNotOwnedByUserExceptionMetadata
    ) {
        super("Bot not owned by user",
            "BOT_NOT_OWNED_BY_USER_EXCEPTION",
            {
                id, userId, originalError 
            })
    }
}