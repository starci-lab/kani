import { AbstractException } from "../abstract"
import { LiquidityPoolId } from "@modules/databases"

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
            { displayId, id }
        )
    }
}