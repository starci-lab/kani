import { ObjectType, Field } from "@nestjs/graphql"
import { DexSchema, LiquidityPoolSchema, TokenSchema } from "@modules/databases"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../abstract"
/**
 * GraphQL response type for the tokens query.
 */
@ObjectType({
    description: "GraphQL response object for fetching tokens.",
})
export class TokensResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Array<TokenSchema>>
{
    @Field(() => [TokenSchema], {
        description: "List of tokens returned by the query.",
    })
        data: Array<TokenSchema>
}

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

/**
 * GraphQL response type for the dexes query.
 */
@ObjectType({
    description: "GraphQL response object for fetching dexes.",
})
export class DexesResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Array<DexSchema>>
{
    @Field(() => [DexSchema], {
        description: "List of dexes returned by the query.",
    })
        data: Array<DexSchema>
}