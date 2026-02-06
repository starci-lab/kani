import type {
    ApolloClient,
    HttpLink,
} from "@apollo/client"

/** Params for creating an Apollo Client instance (factory). */
export interface CreateApolloClientParams {
    uri: string
    withCredentials?: boolean
    enableCache?: boolean
}

/** Result of createApolloClient: configured Apollo Client. */
export type CreateApolloClientResult = ApolloClient

/** Params for the service method that returns or creates a client by key. */
export interface CreateClientParams {
    key: string
    uri: string
    enableCache?: boolean
    withCredentials?: boolean
}

/** Result of createClient: Apollo Client instance for the given key. */
export type CreateClientResult = ApolloClient

/** Params for creating an HTTP link. */
export interface CreateHttpLinkParams {
    uri: string
    withCredentials?: boolean
    headers?: Record<string, string>
}

/** Result of createHttpLink: configured HttpLink. */
export type CreateHttpLinkResult = HttpLink
