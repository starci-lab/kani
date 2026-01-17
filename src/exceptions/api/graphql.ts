import {
    AbstractException 
} from "../abstract"

/** Thrown when GraphQL data not found */
export interface GraphQLDataNotFoundExceptionMetadata {
    query: string
    variables: Record<string, unknown>
    url: string
}
export class GraphQLDataNotFoundException extends AbstractException {
    constructor(
        { query, variables, url }: GraphQLDataNotFoundExceptionMetadata
    ) {
        super("GRAPHQL_DATA_NOT_FOUND_EXCEPTION",
            "GRAPHQL_DATA_NOT_FOUND_EXCEPTION",
            {
                query,
                variables,
                url,
            })
    }
}