import type {
    BotSchema,
    LiquidityPoolSchema,
} from "@modules/databases"
import type {
    LiquidityPoolsSyncedEventPayload,
} from "@modules/event"

/** Params for processing an open-position request. */
export interface HandleOpenPositionParams {
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
    eventPayload?: LiquidityPoolsSyncedEventPayload
}
