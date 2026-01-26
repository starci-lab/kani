import {
    ObjectType, Field 
} from "@nestjs/graphql"
import {
    BalanceConfig 
} from "@modules/databases"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"
import GraphQLJSON from "graphql-type-json"
/**
 * GraphQL response type for the dexes query.
 */
@ObjectType({
    description: "GraphQL response object for fetching account limits.",
})
export class BalanceConfigResponse extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BalanceConfig>
{
    @Field(() => GraphQLJSON,
        {
            description: "Balance config returned by the query.",
        })
        data: BalanceConfig
}
