/** Options for configuring the Kafka module. */
export interface KafkaOptions {
    createTopicsIfNotExists?: boolean
    topics?: Array<string>
}

export interface KafkaMessage<T extends object> {
    // data to be serialized
    data: T
    // digest of the data
    digest?: string
    // pod name
    podName: string
}