import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Metadata when authentication config is not found. */
export type AuthenticationConfigNotFoundExceptionMetadata = AbstractExceptionMetadata

/** Thrown when authentication config is not found. */
export class AuthenticationConfigNotFoundException extends AbstractException {
    constructor(
        { originalError }: AuthenticationConfigNotFoundExceptionMetadata
    ) {
        super(
            "Authentication config not found",
            "AUTHENTICATION_CONFIG_NOT_FOUND_EXCEPTION",
            {
                originalError,
            }
        )
    }
}
