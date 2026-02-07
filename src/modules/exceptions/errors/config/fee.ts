import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Metadata when fee to address or rate is not found. */
export interface FeeToAddressNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    feeToAddress: string
}

/** Thrown when fee to address is not found. */
export class FeeToAddressNotFoundException extends AbstractException {
    constructor(
        { feeToAddress, originalError }: FeeToAddressNotFoundExceptionMetadata
    ) {
        super("Fee to address not found",
            "FEE_TO_ADDRESS_NOT_FOUND_EXCEPTION",
            {
                feeToAddress,
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
export type FeeRateNotSetExceptionMetadata = AbstractExceptionMetadata

/** Thrown when fee rate is not set. */
export class FeeRateNotSetException extends AbstractException {
    constructor(
        { originalError }: FeeRateNotSetExceptionMetadata
    ) {
        super("Fee rate not set",
            "FEE_RATE_NOT_SET_EXCEPTION",
            {
                originalError,
            })
    }
}