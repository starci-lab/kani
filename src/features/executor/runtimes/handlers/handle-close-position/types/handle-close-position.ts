import type {
    BotSchema,
    LiquidityPoolSchema,
} from "@modules/databases"

/** Params for processing a close-position request. */
export interface HandleClosePositionParams {
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
}
