import {
    ApolloClient,
    ApolloLink,
    InMemoryCache,
} from "@apollo/client"
import type {
    CreateApolloClientParams,
    CreateApolloClientResult,
} from "../types"
import {
    createRetryLink 
} from "./retry"
import {
    createTimeoutLink 
} from "./timeout"
import {
    createHttpLink 
} from "./http"
import {
    defaultOptions 
} from "./options"

/**
 * Creates an Apollo Client with retry, timeout and HTTP link. Retry and timeout come from env config.
 *
 * @param param - URI, credentials and cache options
 * @returns Configured Apollo Client instance
 *
 * @example
 * const client = createApolloClient({ uri: "/graphql", withCredentials: true })
 */
export const createApolloClient = ({
    uri,
    withCredentials = false,
    enableCache = true,
}: CreateApolloClientParams): CreateApolloClientResult => {
    // build link chain: retry -> timeout -> http
    const link = ApolloLink.from([
        createRetryLink(),
        createTimeoutLink(),
        createHttpLink({
            uri,
            withCredentials,
            headers: {
            },
        }),
    ])

    return new ApolloClient({
        cache: new InMemoryCache(),
        link,
        defaultOptions: enableCache ? defaultOptions : undefined,
    })
}
