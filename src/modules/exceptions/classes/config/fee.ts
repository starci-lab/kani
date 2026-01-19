import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when fee to address is not found */
export interface FeeToAddressNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    feeToAddress: string
}
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

/** Thrown when fee rate is not found */
export interface FeeRateNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    feeRate: number
}
export class FeeRateNotFoundException extends AbstractException {
    constructor(
        { feeRate, originalError }: FeeRateNotFoundExceptionMetadata
    ) {
        super("Fee rate not found",
            "FEE_RATE_NOT_FOUND_EXCEPTION",
            {
                feeRate,
                originalError,
            })
    }
}

/** Thrown when fee to address is not found */
export type FeeRateNotSetExceptionMetadata = AbstractExceptionMetadata
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