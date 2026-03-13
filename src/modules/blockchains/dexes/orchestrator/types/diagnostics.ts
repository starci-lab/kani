import {
    Dayjs 
} from "dayjs"

/** Result of dynamic liquidity pool info diagnostic readiness check. */
export interface DynamicLiquidityPoolInfoDiagnosticReadinessResult {
    id: string
    snapshotAt?: Dayjs
}

/** Message for liquidity pools synced diagnostic. */
export interface LiquidityPoolsSyncedDiagnosticMessage {
    snapshotAt?: Dayjs
}

/** Result of price diagnostic readiness check. */
export interface PriceDiagnosticReadinessResult {
    id: string
    snapshotAt?: Dayjs
    price?: number
}
