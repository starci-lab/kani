import { ApolloClient, ApolloLink, InMemoryCache } from "@apollo/client"
import { createRetryLink } from "./retry"
import { createTimeoutLink } from "./timeout"
import { createHttpLink } from "./http"
import { defaultOptions } from "./options"

export interface CreateClientParams {
  url: string;
  timeoutMs?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  maxRetry?: number;
}
// no cache client
export const createNoCacheClient = ({
    url,
    timeoutMs = 10000,
    initialRetryDelay = 1000,
    maxRetryDelay = 10000,
    maxRetry = 3,
}: CreateClientParams) =>
    new ApolloClient({
        cache: new InMemoryCache(),
        link: ApolloLink.from([
            createRetryLink({ initialRetryDelay, maxRetryDelay, maxRetry }),
            createTimeoutLink(timeoutMs),
            createHttpLink({ url, withCredentials: false, headers: {} }),
        ]),
        defaultOptions: defaultOptions,
    })

export const createNoCacheCredentialClient = ({
    url,
    timeoutMs = 10000,
    initialRetryDelay = 1000,
    maxRetryDelay = 10000,
    maxRetry = 3,
}: CreateClientParams) =>
    new ApolloClient({
        cache: new InMemoryCache(),
        link: ApolloLink.from([
            createRetryLink({ initialRetryDelay, maxRetryDelay, maxRetry }),
            createTimeoutLink(timeoutMs),
            createHttpLink({ url, withCredentials: true, headers: {} }),
        ]),
        defaultOptions: defaultOptions,
    })

// create client
export const createClient = ({
    url,
    timeoutMs = 10000,
    initialRetryDelay = 1000,
    maxRetryDelay = 10000,
    maxRetry = 3,
}: CreateClientParams) =>
    new ApolloClient({
        cache: new InMemoryCache(),
        link: ApolloLink.from([
            createRetryLink({ initialRetryDelay, maxRetryDelay, maxRetry }),
            createTimeoutLink(timeoutMs),
            createHttpLink({ url, withCredentials: true, headers: {} }),
        ]),
        defaultOptions: defaultOptions,
    })
