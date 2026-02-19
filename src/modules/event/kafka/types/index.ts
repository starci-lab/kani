/** Options for configuring the Kafka module. */
export interface KafkaOptions {
    /** Group ID for the Kafka consumer. */
    groupId: string
    /** Whether to create topics if they do not exist. */
    createTopicsIfNotExists?: boolean
    /** Topics to subscribe to. */
    topics?: Array<string>
}

export interface KafkaMessage<T extends object> {
    // data to be serialized
    data: T
    // digest of the data
    digest?: string
    // instance id
    id: string
}