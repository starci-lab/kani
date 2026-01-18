import {
    Decimal 
} from "decimal.js"
import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when tick is invalid */
export interface InvalidTickScoreExceptionMetadata extends AbstractExceptionMetadata {
    tickScore: Decimal
}
export class InvalidTickScoreException extends AbstractException {
    constructor(
        { tickScore, originalError }: InvalidTickScoreExceptionMetadata
    ) {
        super(
            "Invalid tick score exception", 
            "INVALID_TICK_SCORE_EXCEPTION", 
            {
                tickScore: tickScore.toString(),
                originalError,
            }
        )
    }
}