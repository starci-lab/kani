export interface KafkaOptions {
    createTopics?: boolean
    topics?: Array<string>
    usePublish?: boolean
    useConsume?: boolean
}