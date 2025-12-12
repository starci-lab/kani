import { HttpLink } from "@apollo/client"

export const createHttpLink = ({ url, withCredentials = false, headers = {} }: CreateHttpLinkParams) => {
    return new HttpLink({
        uri: url,
        credentials: withCredentials ? "include" : "same-origin",
        headers,
    })
}

export interface CreateHttpLinkParams {
    url: string
    withCredentials?: boolean
    headers?: Record<string, string>
}