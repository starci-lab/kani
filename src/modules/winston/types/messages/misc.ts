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