import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"

export interface LiquidityPoolNotOwnedByBotExceptionParams extends AbstractExceptionMetadata {
    botId: string
    liquidityPoolId: string
}

export class LiquidityPoolNotOwnedByBotException extends AbstractException {
    constructor(
        {
            botId,
            liquidityPoolId,
        }: LiquidityPoolNotOwnedByBotExceptionParams,
    ) {
        super(
            "Liquidity pool not owned by bot",
            "LIQUIDITY_POOL_NOT_OWNED_BY_BOT_EXCEPTION",
            {
                botId,
                liquidityPoolId,
            }
        )
    }
}