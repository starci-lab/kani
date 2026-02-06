import type {
    ApolloClient 
} from "@apollo/client"

export interface CreateApolloClientParams {
    uri: string
    withCredentials?: boolean
    enableCache?: boolean
}

export type CreateApolloClientResult = ApolloClient
