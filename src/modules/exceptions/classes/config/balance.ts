import {
    ChainId 
} from "@modules/typedefs"
import {
    AbstractException, AbstractExceptionMetadata
} from "../abstract"

/** Thrown when balance config is not found */
export interface BalanceConfigNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    chainId?: ChainId
}
export class BalanceConfigNotFoundException extends AbstractException {
    constructor(
        { originalError, chainId }: BalanceConfigNotFoundExceptionMetadata
    ) {
        super("Balance config not found",
            "BALANCE_CONFIG_NOT_FOUND_EXCEPTION",
            {
                originalError,  
                chainId,
            }
        )
    }
}