import {
    AbstractException, AbstractExceptionMetadata
} from "../abstract"

/** Thrown when account limit config is not found */
export type AccountLimitsConfigNotFoundExceptionMetadata = AbstractExceptionMetadata
export class AccountLimitsConfigNotFoundException extends AbstractException {
    constructor(
        { originalError }: AccountLimitsConfigNotFoundExceptionMetadata
    ) {
        super(
            "Account limit config not found",
            "ACCOUNT_LIMIT_CONFIG_NOT_FOUND_EXCEPTION",
            {
                originalError,
            }
        )
    }
}