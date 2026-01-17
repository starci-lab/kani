import { Decimal } from "decimal.js"
import { AbstractException } from "../abstract"

/** Thrown when tick is invalid */
export interface InvalidTickScoreExceptionMetadata {
    tickScore: Decimal
}
export class InvalidTickScoreException extends AbstractException {
    constructor(
        { tickScore }: InvalidTickScoreExceptionMetadata
    ) {
        super(
            "INVALID_TICK_SCORE_EXCEPTION", 
            "INVALID_TICK_SCORE_EXCEPTION", 
            { tickScore: tickScore.toString() }
        )
    }
}