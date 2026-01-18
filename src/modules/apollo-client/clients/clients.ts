import {
    ApolloClient, ApolloLink, InMemoryCache 
} from "@apollo/client"
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

export interface CreateApolloClientParams {
    uri: string;
    withCredentials?: boolean;
    enableCache?: boolean;
}

/**
 * Create Apollo Client with configurable options
 * Retry and timeout configs are loaded from env config
 * Note: enableCache is reserved for future cache configuration
 */
export const createApolloClient = ({
    uri,
    withCredentials = false,
    enableCache = true,
}: CreateApolloClientParams) => {
    return new ApolloClient({
        cache: new InMemoryCache(),
        link: ApolloLink.from([
            createRetryLink(),
            createTimeoutLink(),
            createHttpLink({
                uri,
                withCredentials,
                headers: {
                },
            }),
        ]),
        defaultOptions: enableCache ? defaultOptions : undefined,
    })
}
