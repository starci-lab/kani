import { LiquidityPoolId } from "@modules/databases"
import { AbstractException } from "../abstract"

/** Thrown when pool tokens are invalid */
export interface InvalidPoolTokensExceptionMetadata {
    liquidityPoolId: LiquidityPoolId
}
export class InvalidPoolTokensException extends AbstractException {
    constructor(
        { liquidityPoolId }: InvalidPoolTokensExceptionMetadata
    ) {
        super(
            "INVALID_POOL_TOKENS_EXCEPTION", 
            "INVALID_POOL_TOKENS_EXCEPTION", 
            {
                liquidityPoolId,
            }
        )
    }
}