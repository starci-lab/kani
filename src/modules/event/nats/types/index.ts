import type {
    NatsConnection, Msg, Subscription 
} from "nats"
import type {
    StreamConnection 
} from "@modules/stream-async-iterator"

/** Options for configuring the NATS module. */
export interface NatsOptions {
    /** Queue group for the NATS consumer (optional). */
    queueGroup?: string
    /** Whether to create streams if they do not exist (JetStream). */
    createStreamsIfNotExists?: boolean
    /** Subjects to subscribe to. */
    subjects?: Array<string>
}

/** Message envelope for bridge compatibility (id, digest, data). */
export interface NatsMessage<T extends object> {
    data: T
    digest?: string
    id: string
}

/**
 * NATS core message (subject, data, reply, headers).
 * Re-export of nats.Msg for use in stream connection and consumers.
 */
export type NatsMsg = Msg

/**
 * Callback for subscribe(subjects, callback).
 * Receives subject and raw payload (Uint8Array).
 */
export type NatsSubscribeCallback = (
    subject: string,
    data: Uint8Array,
) => void | Promise<void>

/**
 * Params to create a NATS stream connection (StreamConnection<NatsMsg>).
 * Used by NatsStreamConnectionService.createConnection().
 */
export interface NatsStreamConnectionParams {
    /** Subjects to subscribe to. */
    subjects: Array<string>
    /** Optional queue group (overrides module option for this connection). */
    queueGroup?: string
}

/**
 * Stream connection over NATS messages.
 * Alias for StreamConnection<NatsMsg>.
 */
export type NatsStreamConnection = StreamConnection<NatsMsg>

/** Params for NatsConsumerService.subscribe(). */
export interface NatsSubscribeParams {
    /** Subjects to subscribe to. */
    subjects: Array<string>
    /** Callback invoked for each message (subject, data). */
    callback: NatsSubscribeCallback
}

/** Result of NatsConsumerService.subscribe(); list of subscriptions. */
export type NatsSubscribeResult = Array<Subscription>

/** Params for NatsProducerService.publish(). */
export interface NatsPublishParams {
    /** NATS subject to publish to. */
    subject: string
    /** Payload string (will be encoded as Uint8Array). */
    payload: string
}

/** Params for NatsMessageFactoryService.create(). */
export interface NatsCreateMessageParams<T extends object> {
    /** Message data to wrap in envelope. */
    message: T
    /** If true, omit digest (e.g. for ping). */
    withoutHash?: boolean
}

/** Result of NatsMessageFactoryService.create(); serialized envelope string. */
export type NatsCreateMessageResult = string

/** Params for NatsMessageFactoryService.parse(). */
export interface NatsParseMessageParams {
    /** Serialized payload string to parse. */
    payload: string
}

/** Result of NatsMessageFactoryService.parse(); parsed envelope. */
export type NatsParseMessageResult<T extends object> = NatsMessage<T>

/**
 * Parsed payload shape when handling incoming NATS bridge messages.
 * Used after NatsMessageFactoryService.parse() in bridge handler.
 */
export interface NatsBridgeParsedPayload {
    id?: string
    digest?: string
    data?: unknown
}

/**
 * Metadata shape used when filtering configMap entries by useNats.
 * Extracted to avoid inline object types in NestJS files.
 */
export interface NatsConfigMapEntryMetadata {
    useNats?: boolean
}

export type { NatsConnection, Subscription }
