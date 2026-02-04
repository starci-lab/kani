import {
    ObjectType, Field 
} from "@nestjs/graphql"
import {
    AccountLimitsConfig 
} from "@modules/databases"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "@modules/api"
import GraphQLJSON from "graphql-type-json"
/**
 * GraphQL response type for the dexes query.
 */
@ObjectType({
    description: "GraphQL response object for fetching account limits.",
})
export class AccountLimitsResponse extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<AccountLimitsConfig>
{
    @Field(() => GraphQLJSON,
        {
            description: "Account limits returned by the query.",
        })
        data: AccountLimitsConfig
}
