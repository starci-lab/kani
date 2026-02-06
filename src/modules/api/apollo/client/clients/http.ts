import {
    HttpLink 
} from "@apollo/client"
import type {
    CreateHttpLinkParams,
    CreateHttpLinkResult,
} from "../types"

/**
 * Creates an HTTP link for Apollo Client with optional credentials and headers.
 *
 * @param param - URI, withCredentials and headers
 * @returns Configured HttpLink instance
 *
 * @example
 * const link = createHttpLink({ uri: "/graphql", withCredentials: true })
 */
export const createHttpLink = ({
    uri,
    withCredentials = false,
    headers = {
    },
}: CreateHttpLinkParams): CreateHttpLinkResult => {
    return new HttpLink({
        uri,
        credentials: withCredentials ? "include" : "same-origin",
        headers,
    })
}
