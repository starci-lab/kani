/**
 * Liquidity Pool Exceptions
 * Errors related to liquidity pool operations (Cetus, FlowX, Turbos, etc.)
 */

import { AbstractException } from "../abstract"
import { LiquidityPoolId } from "@modules/databases"

/** Thrown when liquidity pool cannot be found */
export class LiquidityPoolNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Liquidity pool not found", "LIQUIDITY_POOL_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when liquidity pools validation fails */
export class LiquidityPoolsValidationException extends AbstractException {
    constructor(liquidityPoolIds: Array<LiquidityPoolId>, message?: string) {
        super(message || `Liquidity pools ${liquidityPoolIds.join(", ")} validation failed`, "LIQUIDITY_POOLS_VALIDATION_EXCEPTION", { liquidityPoolIds })
    }
}

/** Thrown when dynamic pool info cannot be found */
export class DynamicLiquidityPoolInfoNotFoundException extends AbstractException {
    constructor(liquidityPoolId: LiquidityPoolId, message?: string) {
        super(message || `Dynamic liquidity pool info ${liquidityPoolId} not found`, "DYNAMIC_LIQUIDITY_POOL_INFO_NOT_FOUND_EXCEPTION", { liquidityPoolId })
    }
}

/** Thrown when dynamic DLMM pool info cannot be found */
export class DynamicDlmmLiquidityPoolInfoNotFoundException extends AbstractException {
    constructor(liquidityPoolId: LiquidityPoolId, message?: string) {
        super(message || `Dynamic dlmm liquidity pool info ${liquidityPoolId} not found`, "DYNAMIC_DLMM_LIQUIDITY_POOL_INFO_NOT_FOUND_EXCEPTION", { liquidityPoolId })
    }
}

/** Thrown when SUI pool has invalid type */
export class SuiLiquidityPoolInvalidTypeException extends AbstractException {
    constructor(liquidityPoolId: LiquidityPoolId, message?: string) {
        super(message || `Sui liquidity pool ${liquidityPoolId} is invalid type`, "SUI_LIQUIDITY_POOL_INVALID_TYPE_EXCEPTION", { liquidityPoolId })
    }
}

/** Thrown when Cetus pool info cannot be found */
export class CetusPoolInfoNotFoundException extends AbstractException {
    constructor(liquidityPoolId: LiquidityPoolId, message?: string) {
        super(message || `Cetus pool info ${liquidityPoolId} not found`, "CETUS_POOL_INFO_NOT_FOUND_EXCEPTION", { liquidityPoolId })
    }
}

/** Thrown when FlowX pool batch info cannot be found */
export class FlowXPoolBatchInfoNotFoundException extends AbstractException {
    constructor(liquidityPoolIds: Array<LiquidityPoolId>, message?: string) {
        super(message || `FlowX pool batch info ${liquidityPoolIds.join(", ")} not found`, "FLOWX_POOL_BATCH_INFO_NOT_FOUND_EXCEPTION", { liquidityPoolIds })
    }
}

/** Thrown when Turbos pool batch info cannot be found */
export class TurbosPoolBatchInfoNotFoundException extends AbstractException {
    constructor(liquidityPoolIds: Array<LiquidityPoolId>, message?: string) {
        super(message || `Turbos pool batch info ${liquidityPoolIds.join(", ")} not found`, "TURBOS_POOL_BATCH_INFO_NOT_FOUND_EXCEPTION", { liquidityPoolIds })
    }
}

/** Thrown when some liquidity pools are not found */
export class SomeLiquidityPoolsNotFoundException extends AbstractException {
    constructor(liquidityPoolIds: Array<string>, message?: string) {
        super(message || `Some liquidity pools ${liquidityPoolIds.join(", ")} not found`, "SOME_LIQUIDITY_POOLS_NOT_FOUND_EXCEPTION", { liquidityPoolIds })
    }
}
