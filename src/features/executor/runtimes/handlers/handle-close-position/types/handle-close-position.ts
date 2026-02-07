import type {
    BotSchema,
    LiquidityPoolSchema,
} from "@modules/databases"
import type {
    LiquidityPoolsSyncedEventPayload,
} from "@modules/event"

/** Params for processing a close-position request. */
export interface HandleClosePositionParams {
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
    eventPayload?: LiquidityPoolsSyncedEventPayload
}
