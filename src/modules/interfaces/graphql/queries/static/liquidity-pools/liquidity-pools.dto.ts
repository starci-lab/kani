import { ObjectType, Field } from "@nestjs/graphql"
import { LiquidityPoolSchema } from "@modules/databases"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../../abstracts"
/**
 * GraphQL response type for the liquidity pools query.
 */
@ObjectType({
    description: "GraphQL response object for fetching liquidity pools.",
})
export class LiquidityPoolsResponse 
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Array<LiquidityPoolSchema>>
{
    @Field(() => [LiquidityPoolSchema], {
        description: "List of liquidity pools returned by the query.",
    })
        data: Array<LiquidityPoolSchema>
}

