import Decimal from "decimal.js"

export const SAFE_QUOTE_RATIO_MIN = new Decimal(0.15)
export const SAFE_QUOTE_RATIO_MAX = new Decimal(0.25)
export const SAFE_QUOTE_RATIO_IDEAL = SAFE_QUOTE_RATIO_MIN.add(SAFE_QUOTE_RATIO_MAX).div(2)
export const ROI_FEE_PERCENTAGE = new Decimal(0.1) // 10%