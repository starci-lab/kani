/**
 * Diagnostics exceptions.
 * Errors related to executor/diagnostics operations.
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    LiquidityPoolId, TokenId 
} from "@modules/databases"

/** Metadata when price diagnostic failed. */
export interface PriceDiagnosticsFailedExceptionMetadata extends AbstractExceptionMetadata {
    tokenIds: Array<TokenId>
}

/** Thrown when price diagnostics fail. */
export class PriceDiagnosticsFailedException extends AbstractException {
    constructor(
        { tokenIds }: PriceDiagnosticsFailedExceptionMetadata
    ) {
        super("Prices diagnostic failed",
            "PRICES_DIAGNOSTIC_FAILED_EXCEPTION",
            {
                tokenIds 
            }
        )
    }
}

/** Thrown when dynamic liquidity pools info diagnostic failed */
export interface DynamicLiquidityPoolInfoDiagnosticsFailedExceptionMetadata extends AbstractExceptionMetadata {
    liquidityPoolIds: Array<LiquidityPoolId>
}

/** Thrown when dynamic liquidity pool info diagnostics fail. */
export class DynamicLiquidityPoolInfoDiagnosticsFailedException extends AbstractException {
    constructor(
        { liquidityPoolIds }: DynamicLiquidityPoolInfoDiagnosticsFailedExceptionMetadata
    ) {
        super("Dynamic liquidity pools info diagnostic failed",
            "DYNAMIC_LIQUIDITY_POOLS_INFO_DIAGNOSTIC_FAILED_EXCEPTION",
            {
                liquidityPoolIds 
            }
        )
    }
}

/** Thrown when price diagnostic is not ready */
export interface PriceDiagnosticNotReadyExceptionMetadata extends AbstractExceptionMetadata {
    tokenId: TokenId
}

/** Thrown when price diagnostic is not ready. */
export class PriceDiagnosticNotReadyException extends AbstractException {
    constructor(
        { tokenId }: PriceDiagnosticNotReadyExceptionMetadata
    ) {
        super("Price diagnostic not ready",
            "PRICE_DIAGNOSTIC_NOT_READY_EXCEPTION",
            {
                tokenId 
            }
        )
    }
}

/** Thrown when dynamic liquidity pool info diagnostic is not ready */
export interface DynamicLiquidityPoolInfoDiagnosticNotReadyExceptionMetadata extends AbstractExceptionMetadata {
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when dynamic liquidity pool info diagnostic is not ready. */
export class DynamicLiquidityPoolInfoDiagnosticNotReadyException extends AbstractException {
    constructor(
        { liquidityPoolId }: DynamicLiquidityPoolInfoDiagnosticNotReadyExceptionMetadata
    ) {
        super("Dynamic liquidity pool info diagnostic not ready",
            "DYNAMIC_LIQUIDITY_POOL_INFO_DIAGNOSTIC_NOT_READY_EXCEPTION",
            {
                liquidityPoolId 
            }
        )
    }
}