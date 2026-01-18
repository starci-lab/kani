import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"
import {
    LiquidityPoolId 
} from "@modules/databases"

/** Thrown when liquidity pool cannot be found */
export interface LiquidityPoolNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    displayId?: LiquidityPoolId
    id?: string
}
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