import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
import {
    TokenId 
} from "@modules/databases"
/** Thrown when token cannot be found */
export interface TokenNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    id?: string
    displayId?: TokenId
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
