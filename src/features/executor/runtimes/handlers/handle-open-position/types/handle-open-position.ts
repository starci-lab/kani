import type {
    BotSchema,
    LiquidityPoolSchema,
} from "@modules/databases"

/** Params for processing an open-position request. */
export interface HandleOpenPositionParams {
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
}
