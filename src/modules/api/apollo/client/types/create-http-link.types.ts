import type {
    HttpLink 
} from "@apollo/client"

export interface CreateHttpLinkParams {
    uri: string
    withCredentials?: boolean
    headers?: Record<string, string>
}

export type CreateHttpLinkResult = HttpLink
