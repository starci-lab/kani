import { EventName } from "./events"

export interface EventMetadata {
    kafka?: {
        // whether the event is required in the observer
        requiredInObserver?: boolean
        numPartitions?: number
        replicationFactor?: number
        topicConfig?: Record<string, string>
        segmentMs?: number
        segmentBytes?: number
        cleanupPolicy?: "delete" | "compact" | "compact,delete"
        retentionMs?: number
        maxMessageBytes?: number
        fileDeleteDelayMs?: number
    },

}
export const eventMetadataMap: Record<EventName, EventMetadata> = {
    [EventName.ExecutorCreated]: {},
    [EventName.ExecutorLoaded]: {},
    [EventName.ReinitializeBalancers]: {
        kafka: {
            requiredInObserver: false
        }
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
        kafka: {
            requiredInObserver: true
        }
    },
    [EventName.DlmmLiquidityPoolsFetched]: {
        kafka: {
            requiredInObserver: true
        }
    },
    [EventName.LiquidityPoolsUpdated]: {
    },
    [EventName.WsCexLastPricesUpdated]: {
        kafka: {
            requiredInObserver: true
        }
    },
    [EventName.WsCexOrderBookUpdated]: {
        kafka: {
            requiredInObserver: true
        }
    },
    [EventName.WsPythLastPricesUpdated]: {
        kafka: {
            requiredInObserver: true
        }
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