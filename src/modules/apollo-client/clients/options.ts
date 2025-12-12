import { ApolloClient } from "@apollo/client"

export const defaultOptions: ApolloClient.DefaultOptions = {
    watchQuery: {
        fetchPolicy: "no-cache",
        errorPolicy: "ignore",
    },
    query: {
        fetchPolicy: "no-cache",
        errorPolicy: "all",
    },
}