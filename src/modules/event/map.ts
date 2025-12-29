import { EventName } from "./events"

export interface EventMetadata {
    kafka?: {
        numPartitions?: number
        replicationFactor?: number
        topicConfig?: Record<string, string>
        segmentMs?: number
        segmentBytes?: number
        cleanupPolicy?: "delete" | "compact" | "compact,delete"
        retentionMs?: number
        maxMessageBytes?: number
        fileDeleteDelayMs?: number
    }
}
export const eventMetadataMap: Record<EventName, EventMetadata> = {
    [EventName.ExecutorCreated]: {},
    [EventName.ExecutorLoaded]: {},
    [EventName.ReinitializeBalancers]: {
        kafka: {}
    },
    [EventName.ExecutorDeleted]: {},
    [EventName.UserCreated]: {},
    [EventName.UserDeleted]: {},
    [EventName.BotCreated]: {},
    [EventName.BotDeleted]: {},
    [EventName.CoinMarketCapPricesFetched]: {},
    [EventName.CoinGeckoPricesFetched]: {},
    [EventName.PoolsUpdated]: {},
    [EventName.LiquidityPoolsFetched]: {
        kafka: {}
    },
    [EventName.DlmmLiquidityPoolsFetched]: {
        kafka: {}
    },
    [EventName.LiquidityPoolsUpdated]: {
    },
    [EventName.WsCexLastPricesUpdated]: {
        kafka: {}
    },
    [EventName.WsCexOrderBookUpdated]: {
        kafka: {}
    },
    [EventName.WsPythLastPricesUpdated]: {
        kafka: {}
    },
    [EventName.DataSeeded]: {},
    [EventName.InitializerLoaded]: {},
    [EventName.InternalLiquidityPoolsFetched]: {},
    [EventName.InternalDlmmLiquidityPoolsFetched]: {},
    [EventName.DistributedDlmmLiquidityPoolsFetched]: {},
    [EventName.DistributedLiquidityPoolsFetched]: {}, 
    [EventName.ActiveBotUpdated]: {},
    [EventName.UpdateActiveBot]: {},
    [EventName.PositionClosed]: {},
    [EventName.PositionOpened]: {},
}