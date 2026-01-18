import {
    LiquidityPoolId 
} from "@modules/databases"
import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when pool tokens are invalid */
export interface InvalidPoolTokensExceptionMetadata extends AbstractExceptionMetadata {
    liquidityPoolId: LiquidityPoolId
}
export class InvalidPoolTokensException extends AbstractException {
    constructor(
        { liquidityPoolId, originalError }: InvalidPoolTokensExceptionMetadata
    ) {
        super(
            "Invalid pool tokens", 
            "INVALID_POOL_TOKENS_EXCEPTION", 
            {
                liquidityPoolId,
                originalError,
            }
        )
    }
}