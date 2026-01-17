import {
    AbstractException 
} from "../abstract"

/** Thrown when fee to address is not found */
export interface FeeToAddressNotFoundExceptionMetadata {
    feeToAddress: string
}
export class FeeToAddressNotFoundException extends AbstractException {
    constructor(
        { feeToAddress }: FeeToAddressNotFoundExceptionMetadata
    ) {
        super("FEE_TO_ADDRESS_NOT_FOUND_EXCEPTION",
            "FEE_TO_ADDRESS_NOT_FOUND_EXCEPTION",
            {
                feeToAddress,
            })
    }
}

/** Thrown when fee rate is not found */
export interface FeeRateNotFoundExceptionMetadata {
    feeRate: number
}
export class FeeRateNotFoundException extends AbstractException {
    constructor(
        { feeRate }: FeeRateNotFoundExceptionMetadata
    ) {
        super("FEE_RATE_NOT_FOUND_EXCEPTION",
            "FEE_RATE_NOT_FOUND_EXCEPTION",
            {
                feeRate 
            })
    }
}