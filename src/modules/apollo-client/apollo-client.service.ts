import {
    ApolloClient 
} from "@apollo/client"
import {
    Injectable 
} from "@nestjs/common"
import {
    createApolloClient 
} from "./clients"

/**
 * The parameters to create an Apollo Client
 */
export interface CreateClientParams {
    /**
     * The key to identify the client
     */
    key: string
    /**
     * The URI of the Apollo Client
     */
    uri: string
    /**
     * Whether to enable cache
     */
    enableCache?: boolean
    /**
     * Whether to include credentials in the request
     */
    withCredentials?: boolean
}

@Injectable()
export class ApolloClientService {
    private readonly clients: Map<string, ApolloClient> = new Map()
    /**
     * Create an Apollo Client
     */
    createClient(
        { 
            key, 
            uri, 
            enableCache = true,
            withCredentials = false,
        }: CreateClientParams
    ) {
        if (this.clients.has(key)) {
            return this.clients.get(key) as ApolloClient
        }
        const client = createApolloClient({
            uri, enableCache, withCredentials 
        })
        this.clients.set(key,
            client)
        return client
    }
}