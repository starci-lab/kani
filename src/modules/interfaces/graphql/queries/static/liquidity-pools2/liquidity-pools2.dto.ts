import { ObjectType, Field, InputType } from "@nestjs/graphql"
import { GraphQLTypeLiquidityPoolId, GraphQLTypeTokenId, LiquidityPoolId, LiquidityPoolSchema, TokenId } from "@modules/databases"
import { 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse, 
    IPaginationPageResponseData, 
    PaginationPageFilters, 
    PaginationPageResponseData
} from "../../../abstracts"

@InputType({
    description: "The request for fetching liquidity pools2.",
})
export class LiquidityPools2PaginationPageFilters extends PaginationPageFilters {
    @Field(() => GraphQLTypeTokenId, {
        nullable: true,
        description: "The token A address.",
    })
        tokenA?: TokenId
    @Field(() => GraphQLTypeTokenId, {
        description: "The token B address.",
        nullable: true,
    })
        tokenB?: TokenId
    @Field(() => [String], {
        description: "The pool ids.",
        nullable: true,
    })
        ids?: Array<string>

    @Field(() => [GraphQLTypeLiquidityPoolId], {
        description: "The pool display ids.",
        nullable: true,
    })
        displayIds?: Array<LiquidityPoolId>
    
    @Field(() => [String], {
        description: "The pool addresses.",
        nullable: true,
    })
        addresses?: Array<string>
    @Field(() => Boolean, {
        defaultValue: true,
        description: "Whether to sort the liquidity pools by APR in descending order.",
    })
        aprDescending?: boolean
}

@InputType({
    description: "The request for fetching liquidity pools2.",
})
export class LiquidityPools2Request {
    @Field(() => LiquidityPools2PaginationPageFilters, {
        description: "The filters for pagination.",
    })
        filters: LiquidityPools2PaginationPageFilters
}

@ObjectType({
    description: "The response for fetching liquidity pools2.",
})
export class LiquidityPools2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<LiquidityPoolSchema> {
    @Field(() => [LiquidityPoolSchema], {
        description: "Liquidity pools.",
    })
        data: Array<LiquidityPoolSchema>
}
/**
 * GraphQL response type for the liquidity pools2 query.
 */
@ObjectType({
    description: "GraphQL response object for fetching liquidity pools2.",
})
export class LiquidityPools2Response 
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<LiquidityPools2ResponseData>
{
    @Field(() => LiquidityPools2ResponseData, {
        description: "The data for the liquidity pools.",
        nullable: true,
    })
        data: LiquidityPools2ResponseData
}

