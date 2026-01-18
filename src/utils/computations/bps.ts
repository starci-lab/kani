import Decimal from "decimal.js"

const BPS_FACTOR = 10_000

export const decimalToBps = (decimal: Decimal): Decimal =>
    decimal.mul(BPS_FACTOR)
  
export const bpsToDecimal = (bps: Decimal): Decimal =>
    bps.div(BPS_FACTOR)