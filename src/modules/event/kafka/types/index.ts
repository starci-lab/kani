import type {
    ServiceName,
} from "@modules/common"

/** Options for configuring the Kafka module. */
export interface KafkaOptions {
    createTopicsIfNotExists?: boolean
    topics?: Array<string>
    usePublish?: boolean
    useConsume?: boolean
    serviceName: ServiceName
    id?: string
}
