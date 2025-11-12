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