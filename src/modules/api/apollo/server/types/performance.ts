import type {
    Types,
} from "mongoose"
import type Decimal from "decimal.js"

/** Params for performance24h: list of bot IDs. */
export interface Performance24HRequest {
    botIds: Array<string>
}

/** Single position snapshot for profit aggregation. */
export interface ProfitPosition {
    snapshotAt: Date
    positionValue: number
    positionValueInUsd: number
}

/** Raw aggregate result per bot (latest + previous snapshot). */
export interface ProfitResult {
    _id: Types.ObjectId
    latest: ProfitPosition
    prev: ProfitPosition
}

/** One bot's 24h performance (ROI, PnL). */
export interface Performance24HResponseData {
    id: string
    roi: Decimal
    roiInUsd: Decimal
    pnl: Decimal
    pnlInUsd: Decimal
}

/** Result of performance24h: array of per-bot performance. */
export type Performance24HResponse = Array<Performance24HResponseData>
