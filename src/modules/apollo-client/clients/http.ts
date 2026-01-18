import {
    HttpLink 
} from "@apollo/client"

export const createHttpLink = ({ uri, withCredentials = false, headers = {
} }: CreateHttpLinkParams) => {
    return new HttpLink({
        uri,
        credentials: withCredentials ? "include" : "same-origin",
        headers,
    })
}

export interface CreateHttpLinkParams {
    uri: string
    withCredentials?: boolean
    headers?: Record<string, string>
}