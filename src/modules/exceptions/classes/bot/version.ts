import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when a bot is not a v2 bot */
export interface BotNotV2ExceptionMetadata extends AbstractExceptionMetadata {
    id: string
}
export class BotNotV2Exception extends AbstractException {
    constructor(
        { id, originalError }: BotNotV2ExceptionMetadata
    ) {
        super("Bot is not a v2 bot",
            "BOT_NOT_V2_EXCEPTION",
            {
                id, originalError 
            })
    }
}