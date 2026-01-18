import {
    ChainId 
} from "@typedefs"
import {
    AbstractException 
} from "../abstract"

/** Thrown when target operational gas amount config is not found */
export interface TargetOperationalGasAmountNotFoundExceptionMetadata {
    chainId: ChainId
}
export class TargetOperationalGasAmountNotFoundException extends AbstractException {
    constructor(
        { chainId }: TargetOperationalGasAmountNotFoundExceptionMetadata
    ) {
        super(
            "TARGET_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION", 
            "TARGET_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION", 
            {
                chainId,
            }
        )
    }
}

/** Thrown when minimum operational gas amount config is not found */
export interface MinOperationalGasAmountNotFoundExceptionMetadata {
    chainId: ChainId
}
export class MinOperationalGasAmountNotFoundException extends AbstractException {
    constructor(
        { chainId }: MinOperationalGasAmountNotFoundExceptionMetadata
    ) {
        super(
            "MIN_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION", 
            "MIN_OPERATIONAL_GAS_AMOUNT_NOT_FOUND_EXCEPTION", 
            {
                chainId,
            }
        )
    }
}
