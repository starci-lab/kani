import type {
    ApolloClient,
} from "@apollo/client"
import {
    Injectable 
} from "@nestjs/common"
import {
    createApolloClient 
} from "./clients"
import type {
    CreateClientParams, CreateClientResult 
} from "./types"

export type {
    CreateClientParams, CreateClientResult 
} from "./types"

/**
 * Service responsible for creating and caching Apollo Client instances by key.
 *
 * @example
 * const client = apolloClientService.createClient({ key: "api", uri: "https://api.example.com/graphql" })
 */
@Injectable()
export class ApolloClientService {
    private readonly clients: Map<string, ApolloClient> =
        new Map()

    /**
     * Returns or creates an Apollo Client for the given key and options.
     *
     * @param param - Key, URI and client options (cache, credentials)
     * @returns Apollo Client instance for the given key
     *
     * @example
     * const client = apolloClientService.createClient({ key: "api", uri: "/graphql", withCredentials: true })
     */
    createClient( {
        key,
        uri,
        enableCache = true,
        withCredentials = false,
    } : CreateClientParams): CreateClientResult {
        // return existing client if already registered
        const existing = this.clients.get(key)
        if (existing) {
            return existing
        }

        // create new client and store by key
        const client = createApolloClient({
            uri,
            enableCache,
            withCredentials,
        })
        this.clients.set(key,
            client)

        return client
    }
}
