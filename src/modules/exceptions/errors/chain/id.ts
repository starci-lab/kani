import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    ChainId 
} from "@modules/common"

/** Metadata when unsupported chain ID is used. */
export interface UnsupportedChainIdExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}

/** Thrown when unsupported chain ID is used. */
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