import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    LiquidityPoolId 
} from "@modules/databases"

/** Metadata when liquidity pool cannot be found. */
export interface LiquidityPoolNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    displayId?: LiquidityPoolId
    id?: string
}

/** Thrown when liquidity pool cannot be found. */
export class LiquidityPoolNotFoundException extends AbstractException {
    constructor(
        { displayId, id, originalError }: LiquidityPoolNotFoundExceptionMetadata
    ) {
        super(
            "Liquidity pool not found", 
            "LIQUIDITY_POOL_NOT_FOUND_EXCEPTION",
            {
                displayId, id, originalError 
            }
        )
    }
}

/** Thrown when liquidity pool no WS idle timeout */
export interface LiquidityPoolNoWsIdleTimeoutExceptionMetadata extends AbstractExceptionMetadata {
    displayId: LiquidityPoolId
}

/** Thrown when liquidity pool WebSocket idle timeout occurs. */
export class LiquidityPoolNoWsIdleTimeoutException extends AbstractException {
    constructor(
        { displayId, originalError }: LiquidityPoolNoWsIdleTimeoutExceptionMetadata
    ) {
        super(
            "Liquidity pool no WS idle timeout", 
            "LIQUIDITY_POOL_NO_WS_IDLE_TIMEOUT_EXCEPTION", 
            {
                displayId, originalError 
            }
        )
    }
}

/** Thrown when liquidity pool clmm state is not found */
export interface LiquidityPoolClmmStateNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when liquidity pool CLMM state cannot be found. */
export class LiquidityPoolClmmStateNotFoundException extends AbstractException {
    constructor(
        { liquidityPoolId, originalError }: LiquidityPoolClmmStateNotFoundExceptionMetadata
    ) {
        super(
            "Liquidity pool clmm state not found",
            "LIQUIDITY_POOL_CLMM_STATE_NOT_FOUND_EXCEPTION",
            {
                liquidityPoolId, originalError 
            }
        )
    }
}

/** Thrown when liquidity pool dlmm state is not found */
export interface LiquidityPoolDlmmStateNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when liquidity pool DLMM state cannot be found. */
export class LiquidityPoolDlmmStateNotFoundException extends AbstractException {
    constructor(
        { liquidityPoolId, originalError }: LiquidityPoolDlmmStateNotFoundExceptionMetadata
    ) {
        super(
            "Liquidity pool dlmm state not found",
            "LIQUIDITY_POOL_DLMM_STATE_NOT_FOUND_EXCEPTION",
            {
                liquidityPoolId, originalError 
            }
        )
    }
}

/** Thrown when some liquidity pools are not found */
export interface SomeLiquidityPoolsNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    actualCount: number
    expectedCount: number
}

/** Thrown when one or more liquidity pools cannot be found. */
export class SomeLiquidityPoolsNotFoundException extends AbstractException {
    constructor(
        { actualCount, expectedCount, originalError }: SomeLiquidityPoolsNotFoundExceptionMetadata
    ) {
        super(
            "Some liquidity pools are not found",
            "SOME_LIQUIDITY_POOLS_NOT_FOUND_EXCEPTION",
            {
                actualCount, expectedCount, originalError 
            }
        )
    }
}