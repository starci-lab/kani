import {
    AbstractException 
} from "../abstract"

export interface SlippageToleranceExceededExceptionParams {
    slippage: number
}
export class SlippageToleranceExceededException extends AbstractException {
    constructor(
        {
            slippage,
        }: SlippageToleranceExceededExceptionParams
    ) {
        super(
            "Slippage tolerance exceeded",
            "SLIPPAGE_TOLERANCE_EXCEEDED",
            {
                slippage,
            }
        )
    }
}