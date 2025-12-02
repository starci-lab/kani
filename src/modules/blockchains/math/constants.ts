import Decimal from "decimal.js"
/**
 * Safe quote ratio range.
 * When the current quote ratio stays within this range, the system won't trigger a swap.
 * Falling outside this range means the position is becoming unbalanced → a swap may be required.
 */
export const SAFE_QUOTE_RATIO_BELOW = new Decimal(0.15)
export const SAFE_QUOTE_RATIO_ABOVE = new Decimal(0.85)

/**
 * Target quote ratio after a swap.
 * This is the range we try to push the position into after swapping,
 * so the system avoids slippage and doesn’t keep re-swapping immediately.
 */
export const EXPECTED_QUOTE_RATIO_BELOW = new Decimal(0.2)
export const EXPECTED_QUOTE_RATIO_ABOVE = new Decimal(0.8)