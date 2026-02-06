import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Metadata when account limits config is not found. */
export type AccountLimitsConfigNotFoundExceptionMetadata = AbstractExceptionMetadata

/** Thrown when account limits config is not found. */
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