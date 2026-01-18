import {
    AbstractException 
} from "../abstract"
import {
    LiquidityPoolId 
} from "@modules/databases"

/** Thrown when liquidity pool cannot be found */
export interface LiquidityPoolNotFoundExceptionMetadata {
    displayId?: LiquidityPoolId
    id?: string
}
export class LiquidityPoolNotFoundException extends AbstractException {
    constructor(
        { displayId, id }: LiquidityPoolNotFoundExceptionMetadata
    ) {
        super(
            "LIQUIDITY_POOL_NOT_FOUND_EXCEPTION", 
            "LIQUIDITY_POOL_NOT_FOUND_EXCEPTION", 
            {
                displayId, id 
            }
        )
    }
}

/** Thrown when liquidity pool no WS idle timeout */
export interface LiquidityPoolNoWsIdleTimeoutExceptionMetadata {
    liquidityPoolId: LiquidityPoolId
}
export class LiquidityPoolNoWsIdleTimeoutException extends AbstractException {
    constructor(
        { liquidityPoolId }: LiquidityPoolNoWsIdleTimeoutExceptionMetadata
    ) {
        super(
            "LIQUIDITY_POOL_NO_WS_IDLE_TIMEOUT_EXCEPTION", 
            "LIQUIDITY_POOL_NO_WS_IDLE_TIMEOUT_EXCEPTION", 
            {
                liquidityPoolId 
            }
        )
    }
}