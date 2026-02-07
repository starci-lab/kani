/** Result of dynamic liquidity pool info diagnostic readiness check. */
export interface DynamicLiquidityPoolInfoDiagnosticReadinessResult {
    id: string
    ready: boolean
    ageMs?: number
}

/** Message for liquidity pools synced diagnostic. */
export interface LiquidityPoolsSyncedDiagnosticMessage {
    ready: boolean
    ageMs?: number
}

/** Result of price diagnostic readiness check. */
export interface PriceDiagnosticReadinessResult {
    id: string
    ready: boolean
    ageMs?: number
    price?: number
}
