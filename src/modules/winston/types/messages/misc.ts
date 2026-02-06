export interface SocketIoClientConnectedMessage {
    clientId: string
    userId: string
}

export interface SocketIoClientDisconnectedMessage {
    clientId: string
    userId: string
}
