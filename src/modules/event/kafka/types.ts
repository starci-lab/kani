export interface KafkaOptions {
    createTopics?: boolean
    modes?: Array<KafkaMode>
    kafkaTopics?: Array<string>
}

export enum KafkaMode {
    Producer = "producer",
    Consumer = "consumer",
}