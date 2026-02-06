import {
    BotSchema
} from "@modules/databases"
import {
    Decimal 
} from "decimal.js"
import {
    LiquidityPoolState 
} from "./pool-state"
import {
    Dayjs 
} from "dayjs"

/**
 * Parameters for calculating reserves.
 */
export interface ReservesParams {
    state: LiquidityPoolState
    bot: BotSchema
}

/**
 * Result of calculating reserves.
 */
export interface ReservesResult {
    reserveA: Decimal
    reserveB: Decimal
    snapshotAt: Dayjs
}

/**
 * Service interface for reserves calculations.
 */
export interface IReservesService {
    reserves(
        params: ReservesParams,
    ): Promise<ReservesResult>
}

/**
 * Parameters for calculating reserves with fees.
 */
export interface ReservesWithFeesParams {
    bot: BotSchema
    state: LiquidityPoolState
}

/**
 * Result of calculating reserves with fees.
 */
export interface ReservesWithFeesResult {
    reserveA: Decimal
    reserveB: Decimal
    feeA: Decimal
    feeB: Decimal
    rewards: Record<string, Decimal>
    snapshotAt: Dayjs
}

/**
 * Service interface for reserves with fees calculations.
 */
export interface IReservesWithFeesService {
    reservesWithFees(
        params: ReservesWithFeesParams,
    ): Promise<ReservesWithFeesResult>
}
