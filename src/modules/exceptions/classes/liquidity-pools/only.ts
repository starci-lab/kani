import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

export interface ExactlyTwoTokensRequiredExceptionMetadata extends AbstractExceptionMetadata {
    tokenIds: Array<string>
}

export class ExactlyTwoTokensRequiredException extends AbstractException {
    constructor(
        { tokenIds, originalError }: ExactlyTwoTokensRequiredExceptionMetadata
    ) {
        super(
            "Exactly two tokens are required",
            "EXACTLY_TWO_TOKENS_REQUIRED_EXCEPTION",
            {
                tokenIds,
                originalError,
            }
        )
    }
}