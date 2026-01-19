import {
    AbstractException, AbstractExceptionMetadata
} from "../abstract"
import {
    LiquidityPoolId 
} from "@modules/databases"
/** Thrown when multiple DLMM positions are not supported */
export interface MeteoraMultipleDlmmPositionsNotSupportedExceptionMetadata extends AbstractExceptionMetadata {
    liquidityPoolId: LiquidityPoolId
    positionCount: number
}

export class MeteoraMultipleDlmmPositionsNotSupportedException extends AbstractException {
    constructor(
        { liquidityPoolId, positionCount, originalError }: MeteoraMultipleDlmmPositionsNotSupportedExceptionMetadata
    ) {
        super(
            "Meteora multiple DLMM positions not supported",
            "METEORA_MULTIPLE_DLMM_POSITIONS_NOT_SUPPORTED_EXCEPTION",
            {
                positionCount,
                liquidityPoolId,
                originalError,
            }
        )
    }
}

/** Thrown when the default bin array bitmap is overflowed */
export type DLMMOverflowDefaultBinArrayBitmapExceptionMetadata = AbstractExceptionMetadata
export class DLMMOverflowDefaultBinArrayBitmapException extends AbstractException {
    constructor(
        { originalError }: DLMMOverflowDefaultBinArrayBitmapExceptionMetadata
    ) {
        super(
            "DLMM overflow default bin array bitmap",
            "DLMM_OVERFLOW_DEFAULT_BIN_ARRAY_BITMAP_EXCEPTION",
            {
                originalError,
            }
        )
    }
}

