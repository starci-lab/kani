import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when authentication config is not found */
export type AuthenticationConfigNotFoundExceptionMetadata = AbstractExceptionMetadata
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
