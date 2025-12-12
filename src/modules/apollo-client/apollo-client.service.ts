import { ApolloClient } from "@apollo/client"
import { Injectable } from "@nestjs/common"
import { createNoCacheClient } from "./clients"

export interface CreateClientParams {
    key: string
    url: string
    timeoutMs?: number
}
@Injectable()
export class ApolloClientService {
    private readonly clients: Map<string, ApolloClient> = new Map()
    
    createNoCacheClient(
        { 
            key, 
            url, 
            timeoutMs = 10000 
        }: CreateClientParams
    ) {
        if (this.clients.has(key)) {
            return this.clients.get(key) as ApolloClient
        }
        const client = createNoCacheClient({ url, timeoutMs })
        this.clients.set(key, client)
        return client
    }
}