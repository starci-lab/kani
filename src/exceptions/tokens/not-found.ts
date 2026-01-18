import {
    TokenId 
} from "@modules/databases"
import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when token cannot be found */
export interface TokenNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    tokenId: TokenId
}
export class TokenNotFoundException extends AbstractException {
    constructor(
        { tokenId, originalError }: TokenNotFoundExceptionMetadata
    ) {
        super(
            "Token not found",
            "TOKEN_NOT_FOUND_EXCEPTION",
            {
                tokenId,
                originalError,
            }
        )
    }
}
