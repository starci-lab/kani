import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import {
    ChainId,
} from "@modules/common"

/** Metadata when fee to address or rate is not found. */
export interface FeeToAddressNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}

/** Thrown when fee to address is not found. */
export class FeeToAddressNotFoundException extends AbstractException {
    constructor(
        { chainId, originalError }: FeeToAddressNotFoundExceptionMetadata
    ) {
        super("Fee to address not found",
            "FEE_TO_ADDRESS_NOT_FOUND_EXCEPTION",
            {
                chainId,
                originalError,
            })
    }
}

/** Metadata when fee rate is not found. */
export type FeeRateNotFoundExceptionMetadata = AbstractExceptionMetadata

/** Thrown when fee rate is not found. */
export class FeeRateNotFoundException extends AbstractException {
    constructor(
        { originalError }: FeeRateNotFoundExceptionMetadata
    ) {
        super("Fee rate not found",
            "FEE_RATE_NOT_FOUND_EXCEPTION",
            {
                originalError,
            })
    }
}

/** Metadata when fee rate is not set. */
export interface FeeRateNotSetExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}

/** Thrown when fee rate is not set. */
export class FeeRateNotSetException extends AbstractException {
    constructor(
        { chainId, originalError }: FeeRateNotSetExceptionMetadata
    ) {
        super("Fee rate not set",
            "FEE_RATE_NOT_SET_EXCEPTION",
            {
                chainId,
                originalError,
            })
    }
}


/** Metadata when fee rate is not valid. */
export interface FeeRateNotValidExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}

/** Thrown when fee rate is not valid. */
export class FeeRateNotValidException extends AbstractException {
    constructor(
        { chainId, originalError }: FeeRateNotValidExceptionMetadata
    ) {
        super("Fee rate not valid",
            "FEE_RATE_NOT_VALID_EXCEPTION",
            {
                chainId,
                originalError,
            })
    }
}