export interface HttpAndWsClients<ClientType> {
    http: Array<ClientType>
    ws: Array<ClientType>
}