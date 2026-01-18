import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when GraphQL data not found */
export interface GraphQLDataNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    query: string
    variables: Record<string, unknown>
    url: string
}
export class GraphQLDataNotFoundException extends AbstractException {
    constructor(
        { query, variables, url, originalError }: GraphQLDataNotFoundExceptionMetadata
    ) {
        super(
            "GraphQL data not found",
            "GRAPHQL_DATA_NOT_FOUND_EXCEPTION",
            {
                query,
                variables,
                url,
                originalError,
            }
        )
    }
}