import {
    ObjectType, Field 
} from "@nestjs/graphql"
import {
    AuthenticationConfig 
} from "@modules/databases"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"
import GraphQLJSON from "graphql-type-json"
/**
 * GraphQL response type for the authentication config query.
 */
@ObjectType({
    description: "GraphQL response object for fetching authentication config.",
})
export class AuthenticationConfigResponse extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<AuthenticationConfig>
{
    @Field(() => GraphQLJSON,
        {
            description: "Authentication config returned by the query.",
        })
        data: AuthenticationConfig
}
