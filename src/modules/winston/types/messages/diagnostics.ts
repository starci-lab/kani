import {
    LiquidityPoolId,
    TokenId,
} from "@modules/databases"

export interface PriceDiagnosticFailedMessage {
    tokenId: TokenId
    error: string
}

export interface PriceDiagnosticSuccessMessage {
    tokenId: TokenId
}

export interface PriceDiagnosticFailedNotFoundMessage {
    tokenId: TokenId
}

export interface PriceDiagnosticFailedStaleMessage {
    tokenId: TokenId
    ageMs: number
    price: number
}

export interface DynamicLiquidityPoolInfoDiagnosticFailedNotFoundMessage {
    liquidityPoolId: LiquidityPoolId
}

export interface DynamicLiquidityPoolInfoDiagnosticSuccessMessage {
    liquidityPoolId: LiquidityPoolId
}

export interface DynamicLiquidityPoolInfoDiagnosticFailedStaleMessage {
    liquidityPoolId: LiquidityPoolId
    ageMs: number
}

export interface DynamicLiquidityPoolInfoDiagnosticFailedMessage {
    liquidityPoolId: LiquidityPoolId
    error: string
}

export interface DiagnosticsReadyMessage {
    bootstrapTimeMs: number
}

export interface EvalSnapshotMessage {
    botId: string
    totalBalanceAmountInUsd: string
    minRequiredAmountInUsd: string
    eligible: boolean
}
