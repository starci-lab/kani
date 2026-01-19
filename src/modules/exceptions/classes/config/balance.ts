import {
    AbstractException, AbstractExceptionMetadata
} from "../abstract"

/** Thrown when balance config is not found */
export type BalanceConfigNotFoundExceptionMetadata = AbstractExceptionMetadata
export class BalanceConfigNotFoundException extends AbstractException {
    constructor(
        { originalError }: BalanceConfigNotFoundExceptionMetadata
    ) {
        super("Balance config not found",
            "BALANCE_CONFIG_NOT_FOUND_EXCEPTION",
            {
                originalError,  
            }
        )
    }
}