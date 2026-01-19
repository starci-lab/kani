import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when a bot is not found */
export interface BotNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}
export class BotNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: BotNotFoundExceptionMetadata
    ) {
        super("Bot not found",
            "BOT_NOT_FOUND_EXCEPTION",
            {
                botId, originalError 
            })
    }
}

/** Thrown when a bot's encrypted private key is not found */
export interface BotEncryptedPrivateKeyNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}
export class BotEncryptedPrivateKeyNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: BotEncryptedPrivateKeyNotFoundExceptionMetadata
    ) {
        super("Bot encrypted private key not found",
            "BOT_ENCRYPTED_PRIVATE_KEY_NOT_FOUND_EXCEPTION",
            {
                botId, originalError 
            })
    }
}