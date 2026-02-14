/**
 * Represents HTTP and WebSocket clients for a given client type.
 */
export interface HttpAndWsClients<ClientType> {
    /** Array of HTTP clients. */
    http: Array<ClientType>
    /** Array of WebSocket clients. */
    ws: Array<ClientType>
}
