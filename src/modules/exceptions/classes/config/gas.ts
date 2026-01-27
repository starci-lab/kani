import {
    ChainId
} from "@modules/typedefs"
import {
    AbstractException, AbstractExceptionMetadata
} from "../abstract"

/** Thrown when target operational gas amount config is not found */
export interface TargetOperationalGasAmountNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    chainId?: ChainId
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
    chainId?: ChainId
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

/** Thrown when additional swap amount gas config is not found */
export interface SwapAmountGasNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}
export class SwapAmountGasNotFoundException extends AbstractException {
    constructor(
        { chainId, originalError }: SwapAmountGasNotFoundExceptionMetadata
    ) {
        super(
            "Swap amount gas not found",
            "SWAP_AMOUNT_GAS_NOT_FOUND_EXCEPTION",
            {
                chainId,
                originalError,
            }
        )
    }
}

/** Thrown when gas config is not found */
export type GasConfigNotFoundExceptionMetadata = AbstractExceptionMetadata
export class GasConfigNotFoundException extends AbstractException {
    constructor(
        { originalError }: GasConfigNotFoundExceptionMetadata
    ) {
        super("Gas config not found",
            "GAS_CONFIG_NOT_FOUND_EXCEPTION",
            {
                originalError,
            })
    }
}