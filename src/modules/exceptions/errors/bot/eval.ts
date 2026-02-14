import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
/** Thrown when a bot is not eligible for an eval snapshot */
export interface BotEvalSnapshotNotEligibleExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}
/** Thrown when a bot is not eligible for an eval snapshot */
export class BotEvalSnapshotNotEligibleException extends AbstractException {
    constructor(
        { botId, originalError }: BotEvalSnapshotNotEligibleExceptionMetadata
    ) {
        super("Bot eval snapshot not eligible",
            "BOT_EVAL_SNAPSHOT_NOT_ELIGIBLE_EXCEPTION",
            {
                botId, 
                originalError 
            }
        )
    }
}