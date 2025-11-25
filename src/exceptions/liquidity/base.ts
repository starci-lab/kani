import { Decimal } from "decimal.js"
import { AbstractException } from "../abstract"

export class LiquidityAmountNotAcceptableException extends AbstractException {
    constructor(deviation: Decimal, message?: string) {
        super(
            message || "Liquidity amount is not acceptable", 
            "LIQUIDITY_AMOUNT_NOT_ACCEPTABLE_EXCEPTION", { deviation: deviation.toString() 
            })
    }
}

export class LiquidityAmountsNotAcceptableException extends AbstractException {
    constructor(ratio: Decimal, message?: string) {
        super(
            message || "Liquidity amounts are not acceptable", 
            "LIQUIDITY_AMOUNTS_NOT_ACCEPTABLE_EXCEPTION", { ratio: ratio.toString() }
        )
    }
}

export class PnlIsNegativeException extends AbstractException {
    constructor(pnl: Decimal, message?: string) {
        super(message || "Pnl is negative", "PNL_IS_NEGATIVE_EXCEPTION", { pnl: pnl.toNumber() })
    }
}

export class MultipleDlmmPositionsNotSupportedException extends AbstractException {
    constructor(numberOfPositions: number, message?: string) {
        super(message || "Multiple Dlmm positions not supported", "MULTIPLE_DLMM_POSITIONS_NOT_SUPPORTED_EXCEPTION", { numberOfPositions })
    }
}

export class DLMMOverflowDefaultBinArrayBitmapException extends AbstractException {
    constructor(message?: string) {
        super(message || "DLMM overflow default bin array bitmap", "DLMM_OVERFLOW_DEFAULT_BIN_ARRAY_BITMAP_EXCEPTION")
    }
}