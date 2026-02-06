import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    LiquidityPoolId 
} from "@modules/databases"

/** Metadata when pool tokens are invalid. */
export interface InvalidPoolTokensExceptionMetadata extends AbstractExceptionMetadata {
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when pool tokens are invalid. */
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