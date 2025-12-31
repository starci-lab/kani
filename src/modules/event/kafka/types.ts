export interface KafkaOptions {
    createTopics?: boolean
    modes?: Array<KafkaMode>
}

export enum KafkaMode {
    Producer = "producer",
    Consumer = "consumer",
}