export interface SocketIoClientConnectedMessage {
    clientId: string
    userId: string
}

export interface SocketIoClientDisconnectedMessage {
    clientId: string
    userId: string
}

export interface ConsulRegisterFailedMessage {
    error: string
}

export interface ConsulRegisterSuccessfullyMessage {
    id: string
}

export interface NatsConsumerOpenedMessage {
    subjects: Array<string>
}

export interface NatsConsumerClosedMessage {
    subjects: Array<string>
    durationMs: number | null
}

export interface NatsConsumerErrorMessage {
    subjects: Array<string>
    error: string
    stack?: string
}

/** Payload for execution latency log (id and duration in seconds). */
export interface ExecutionLatencyMessage {
    /** The id of the context. */
    id: string
    /** The name of the context. */
    name: string
    /** The duration of the execution in seconds. */
    durationSeconds: number
    /** The description of the execution. */
    description: string
}