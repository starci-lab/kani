import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when a bot is not found */
export interface BotNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id: string
}
export class BotNotFoundException extends AbstractException {
    constructor(
        { id, originalError }: BotNotFoundExceptionMetadata
    ) {
        super("Bot not found",
            "BOT_NOT_FOUND_EXCEPTION",
            {
                id, originalError 
            })
    }
}

/** Thrown when a bot's encrypted private key is not found */
export interface BotEncryptedPrivateKeyNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id: string
}
export class BotEncryptedPrivateKeyNotFoundException extends AbstractException {
    constructor(
        { id, originalError }: BotEncryptedPrivateKeyNotFoundExceptionMetadata
    ) {
        super("Bot encrypted private key not found",
            "BOT_ENCRYPTED_PRIVATE_KEY_NOT_FOUND_EXCEPTION",
            {
                id, originalError 
            })
    }
}