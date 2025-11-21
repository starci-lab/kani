import Decimal from "decimal.js"

export const Q64 = new Decimal(2).pow(64)
export const SAFE_QUOTE_RATIO_MIN = new Decimal(0.15)
export const SAFE_QUOTE_RATIO_MAX = new Decimal(0.25)
export const SAFE_QUOTE_RATIO_IDEAL = SAFE_QUOTE_RATIO_MIN.add(SAFE_QUOTE_RATIO_MAX).div(2)