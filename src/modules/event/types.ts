import { OnOptions } from "eventemitter2"

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