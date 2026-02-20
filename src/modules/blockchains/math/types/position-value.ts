import BN from "bn.js"
import Decimal from "decimal.js"
import {
    TokenSchema
} from "@modules/databases"

/** Parameters for calculating position value. */
export interface CalculatePositionValueParams {
    before: CalculatePositionValue
    after: CalculatePositionValue
    targetToken: TokenSchema
    quoteToken: TokenSchema
    gasToken: TokenSchema
    isClose?: boolean
}

/** Result of position value calculation. */
export interface CalculatePositionValueResult {
    positionValue: Decimal
    positionValueInUsd: Decimal
    balanceValue: Decimal
    balanceValueInUsd: Decimal
}

/**
 * Balance amounts for a specific point in time.
 * All amounts are in raw token units (not decimal-adjusted).
 */
export interface CalculatePositionValue {
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
    incentiveBalanceAmounts?: Record<string, BN>
}
