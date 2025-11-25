import { LiquidityPoolId } from "@modules/databases"
import { AbstractException } from "../abstract"

export class LiquidityPoolNotFoundException extends AbstractException {
    constructor(liquidityPoolId: LiquidityPoolId, message?: string) {
        super(
            message || `Liquidity pool ${liquidityPoolId} not found`, 
            "LIQUIDITY_POOL_NOT_FOUND_EXCEPTION", 
            { liquidityPoolId }
        )
    }
}

export class LiquidityPoolsValidationException extends AbstractException {
    constructor(liquidityPoolIds: Array<LiquidityPoolId>, message?: string) {
        super(
            message || `Liquidity pools ${liquidityPoolIds.join(", ")} validation failed`, 
            "LIQUIDITY_POOLS_VALIDATION_EXCEPTION", 
            { liquidityPoolIds }
        )
    }
}

export class DynamicLiquidityPoolInfoNotFoundException extends AbstractException {
    constructor(liquidityPoolId: LiquidityPoolId, message?: string) {
        super(
            message || `Dynamic liquidity pool info ${liquidityPoolId} not found`, 
            "DYNAMIC_LIQUIDITY_POOL_INFO_NOT_FOUND_EXCEPTION", 
            { liquidityPoolId }
        )
    }
}

export class DynamicDlmmLiquidityPoolInfoNotFoundException extends AbstractException {
    constructor(liquidityPoolId: LiquidityPoolId, message?: string) {
        super(
            message || `Dynamic dlmm liquidity pool info ${liquidityPoolId} not found`, 
            "DYNAMIC_DLMM_LIQUIDITY_POOL_INFO_NOT_FOUND_EXCEPTION", 
            { liquidityPoolId }
        )
    }
}