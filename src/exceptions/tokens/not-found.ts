import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when token cannot be found */
export interface TokenNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id?: string
    displayId?: string
    conditions?: unknown
}
export class TokenNotFoundException extends AbstractException {
    constructor(
        { id, displayId, conditions, originalError }: TokenNotFoundExceptionMetadata
    ) {
        super(
            "Token not found",
            "TOKEN_NOT_FOUND_EXCEPTION",
            {
                id,
                displayId,
                conditions,
                originalError,
            }
        )
    }
}
