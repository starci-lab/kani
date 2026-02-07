/** Options for configuring the Kafka module. */
export interface KafkaOptions {
    createTopicsIfNotExists?: boolean
    topics?: Array<string>
    usePublish?: boolean
    useConsume?: boolean
    clientId: string
}
