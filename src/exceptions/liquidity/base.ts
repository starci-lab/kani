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