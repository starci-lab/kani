import {
    KafkaOptions 
} from "./kafka"

// Kafka topic configuration
export interface KafkaTopicConfig {
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
}

export interface EventPayloadType<T> {
    data: T
    instanceId: string
}

export interface EventOptions {
    kafka?: KafkaOptions
}