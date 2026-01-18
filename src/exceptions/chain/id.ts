import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
import {
    ChainId 
} from "@typedefs"

/** Thrown when unsupported chain ID is used */
export interface UnsupportedChainIdExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}

export class UnsupportedChainIdException extends AbstractException {
    constructor(
        { chainId, originalError }: UnsupportedChainIdExceptionMetadata
    ) {
        super("Unsupported chain ID",
            "UNSUPPORTED_CHAIN_ID_EXCEPTION",
            {
                chainId,
                originalError,
            }
        )
    }
}