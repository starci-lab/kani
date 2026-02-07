import {
    Field, ObjectType,
} from "@nestjs/graphql"
import {
    LiquidityPoolSchema,
} from "@modules/databases"
import {
    AbstractGraphQLResponse,
    IAbstractGraphQLResponse,
    IPaginationPageResponseData,
    PaginationPageResponseData,
} from "@modules/api"

/** The response for fetching liquidity pools. */
@ObjectType({
    description: "The response for fetching liquidity pools.",
})
export class LiquidityPoolsResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<LiquidityPoolSchema>
{
    @Field(() => [LiquidityPoolSchema],
        {
            description: "Liquidity pools.",
        })
        data: Array<LiquidityPoolSchema>
}

/** GraphQL response type for the liquidity pools query. */
@ObjectType({
    description: "GraphQL response object for fetching liquidity pools.",
})
export class LiquidityPoolsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<LiquidityPoolsResponseData>
{
    @Field(() => LiquidityPoolsResponseData,
        {
            description: "The data for the liquidity pools.",
            nullable: true,
        })
        data: LiquidityPoolsResponseData
}
