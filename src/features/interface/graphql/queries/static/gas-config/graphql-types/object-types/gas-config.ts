import {
    Field, ObjectType,
} from "@nestjs/graphql"
import {
    GasConfig,
} from "@modules/databases"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse,
} from "@modules/api"
import GraphQLJSON from "graphql-type-json"

/** GraphQL response type for the gas config query. */
@ObjectType({
    description: "GraphQL response object for fetching account limits.",
})
export class GasConfigResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<GasConfig>
{
    @Field(() => GraphQLJSON,
        {
            description: "Gas config returned by the query.",
        })
        data: GasConfig
}
