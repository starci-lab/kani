import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when tick is invalid */
export interface InvalidTickScoreExceptionMetadata extends AbstractExceptionMetadata {
    tickScore: number
}
export class InvalidTickScoreException extends AbstractException {
    constructor(
        { tickScore, originalError }: InvalidTickScoreExceptionMetadata
    ) {
        super(
            "Invalid tick score exception", 
            "INVALID_TICK_SCORE_EXCEPTION", 
            {
                tickScore,
                originalError,
            }
        )
    }
}