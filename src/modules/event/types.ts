import { OnOptions } from "eventemitter2"
import { KafkaOptions } from "./kafka"

export enum EventType {
    Internal = "internal",
    Kafka = "kafka"
}

export type OnEventOptions = OnOptions & {
    prependListener?: boolean;
    suppressErrors?: boolean;
};

export interface EventPayloadType<T> {
    data: T
    instanceId: string
}

export interface EventOptions {
    isGlobal?: boolean
    kafka?: KafkaOptions
}