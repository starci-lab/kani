import Decimal from "decimal.js"

export const decimalToBps = (decimal: Decimal): Decimal => {
    return decimal.mul(10000)
}