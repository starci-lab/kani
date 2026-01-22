/**
 * Executor Exceptions
 * Errors related to executor service operations
 */

import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
import {
    LiquidityPoolId,
    TokenId 
} from "@modules/databases"

/** Thrown when price diagnostic failed */
export interface PriceDiagnosticsFailedExceptionMetadata extends AbstractExceptionMetadata {
    tokenIds: Array<TokenId>
}
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