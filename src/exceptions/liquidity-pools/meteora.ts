import {
    AbstractException, AbstractExceptionMetadata
} from "../abstract"

/** Thrown when multiple DLMM positions are not supported */
export interface MeteoraMultipleDlmmPositionsNotSupportedExceptionMetadata extends AbstractExceptionMetadata {
    liquidityPoolId: string
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