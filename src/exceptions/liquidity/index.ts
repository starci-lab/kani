/**
 * Liquidity Exceptions
 * Errors related to liquidity operations and DLMM
 */

import { AbstractException } from "../abstract"
import { Decimal } from "decimal.js"

/** Thrown when liquidity amount deviation is not acceptable */
export class LiquidityAmountNotAcceptableException extends AbstractException {
    constructor(deviation: Decimal, message?: string) {
        super(message || "Liquidity amount is not acceptable", "LIQUIDITY_AMOUNT_NOT_ACCEPTABLE_EXCEPTION", { deviation: deviation.toString() })
    }
}

/** Thrown when liquidity amounts ratio is not acceptable */
export class LiquidityAmountsNotAcceptableException extends AbstractException {
    constructor(ratio: Decimal, message?: string) {
        super(message || "Liquidity amounts are not acceptable", "LIQUIDITY_AMOUNTS_NOT_ACCEPTABLE_EXCEPTION", { ratio: ratio.toString() })
    }
}

/** Thrown when PnL calculation results in negative value */
export class PnlIsNegativeException extends AbstractException {
    constructor(pnl: Decimal, message?: string) {
        super(message || "Pnl is negative", "PNL_IS_NEGATIVE_EXCEPTION", { pnl: pnl.toNumber() })
    }
}

/** Thrown when multiple DLMM positions are detected but not supported */
export class MultipleDlmmPositionsNotSupportedException extends AbstractException {
    constructor(numberOfPositions: number, message?: string) {
        super(message || "Multiple Dlmm positions not supported", "MULTIPLE_DLMM_POSITIONS_NOT_SUPPORTED_EXCEPTION", { numberOfPositions })
    }
}

/** Thrown when DLMM operation overflows bin array bitmap */
export class DLMMOverflowDefaultBinArrayBitmapException extends AbstractException {
    constructor(message?: string) {
        super(message || "DLMM overflow default bin array bitmap", "DLMM_OVERFLOW_DEFAULT_BIN_ARRAY_BITMAP_EXCEPTION")
    }
}

/** Thrown when bot is missing required parameters */
export class BotMissingParametersException extends AbstractException {
    constructor(message?: string) {
        super(message || "Bot missing parameters", "BOT_MISSING_PARAMETERS_EXCEPTION")
    }
}

/** Thrown when RPC is missing required parameters */
export class RpcMissingParametersException extends AbstractException {
    constructor(message?: string) {
        super(message || "Rpc missing parameters", "RPC_MISSING_PARAMETERS_EXCEPTION")
    }
}
