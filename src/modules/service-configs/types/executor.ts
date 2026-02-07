import type {
    BotSchema 
} from "@modules/databases"

/** Params for building full executor endpoint path. */
export interface BuildExecutorFullEndpointPathParams {
    tags: string
    api: string
    bot: BotSchema
}
