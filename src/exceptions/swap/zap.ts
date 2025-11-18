import { AbstractException } from "../abstract"
import { Decimal } from "decimal.js"

export class ZapAmountNotAcceptableException extends AbstractException {
    constructor(deviation: Decimal, message?: string) {
        super(
            message || `Zap amount is not acceptable: ${deviation.toString()}`, 
            "ZAP_AMOUNT_NOT_ACCEPTABLE_EXCEPTION", 
            { deviation: deviation.toString() }
        )
    }
}