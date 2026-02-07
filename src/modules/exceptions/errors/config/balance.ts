import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    ChainId 
} from "@modules/common"

/** Metadata when balance config is not found. */
export interface BalanceConfigNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    chainId?: ChainId
}

/** Thrown when balance config is not found. */
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