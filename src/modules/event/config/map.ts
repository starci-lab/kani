import {
    EventName
} from "./enum"
import {
    ClmmLiquidityPoolsSyncedEventPayload, DlmmLiquidityPoolsSyncedEventPayload 
} from "./types"
import {
    KafkaTopicConfig 
} from "../types"

export const configMap = {
    [EventName.ClmmLiquidityPoolsSynced]: {
        useKafka: true,
        useLocal: false,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {    
        } as ClmmLiquidityPoolsSyncedEventPayload
    },
    [EventName.DlmmLiquidityPoolsSynced]: {
        useKafka: true,
        useLocal: false,
        config: {
        } as Partial<KafkaTopicConfig>,
        eventPayload: {
        } as DlmmLiquidityPoolsSyncedEventPayload
    },
}