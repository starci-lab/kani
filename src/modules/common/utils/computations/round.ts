import {
    envConfig,
} from "@modules/env"
import Decimal from "decimal.js"

export const round = (
    decimal: Decimal,
    fractionDigits = envConfig().computation.round.fractionDigits,
): Decimal => {
    return decimal.toDecimalPlaces(fractionDigits,
        Decimal.ROUND_HALF_UP)
}
