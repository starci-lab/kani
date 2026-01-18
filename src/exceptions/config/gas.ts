import {
    ChainId
} from "@typedefs"
import {
    AbstractException, AbstractExceptionMetadata
} from "../abstract"

/** Thrown when target operational gas amount config is not found */
export interface TargetOperationalGasAmountNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}
export class TargetOperationalGasAmountNotFoundException extends AbstractException {
    constructor(
        { chainId, originalError }: TargetOperationalGasAmountNotFoundExceptionMetadata
    ) {
        super(
            "Target operational gas amount not found",
            "TARGET_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION",
            {
                chainId,
                originalError,
            }
        )
    }
}

/** Thrown when minimum operational gas amount config is not found */
export interface MinOperationalGasAmountNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}
export class MinOperationalGasAmountNotFoundException extends AbstractException {
    constructor(
        { chainId, originalError }: MinOperationalGasAmountNotFoundExceptionMetadata
    ) {
        super(
            "Minimum operational gas amount not found",
            "MIN_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION",
            {
                chainId,
                originalError,
            }
        )
    }
}
