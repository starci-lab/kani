import {
    AbstractException 
} from "../abstract"
import {
    LiquidityPoolId 
} from "@modules/databases"

/** Thrown when multiple DLMM positions are not supported */
export interface MeteoraMultipleDlmmPositionsNotSupportedExceptionMetadata {
    positionCount: number
    liquidityPoolId: LiquidityPoolId
}
export class MeteoraMultipleDlmmPositionsNotSupportedException extends AbstractException {
    constructor(
        { positionCount, liquidityPoolId }: MeteoraMultipleDlmmPositionsNotSupportedExceptionMetadata
    ) {
        super(
            "MULTIPLE_DLMM_POSITIONS_NOT_SUPPORTED_EXCEPTION",
            "MULTIPLE_DLMM_POSITIONS_NOT_SUPPORTED_EXCEPTION",
            {
                positionCount,
                liquidityPoolId,
            }
        )
    }
}