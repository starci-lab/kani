import {
    ApolloClient 
} from "@apollo/client"

/** Default fetch and error policies for Apollo Client queries. */
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
