import { ObjectType, Field, Float, ID, InputType } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../abstract"
import { GraphQLTypeLiquidityPoolId, LiquidityPoolId } from "@modules/databases"
/**
 * GraphQL response type for the dynamic liquidity pools query.
 */
@ObjectType({
    description: "GraphQL response object for fetching dynamic liquidity pools.",
})
export class DynamicLiquidityPoolInfo {
    @Field(() => ID, {
        nullable: true,
        description: "The ID of the liquidity pool.",
    })
        id: string
    @Field(() => Float, {
        nullable: true,
        description: "Current tick index of the liquidity pool.",
    })
        tickCurrent?: number

    @Field(() => Float, {
        nullable: true,
        description: "Current active id of the liquidity pool.",
    })
        activeId?: number

    @Field(() => String, {
        nullable: true,
        description: "Total liquidity of the pool.",
    })
        liquidity?: string

    @Field(() => Float, {
        nullable: true,
        description: "Current price of the pool.",
    })
        price?: number

    @Field(() => Float, {
        nullable: true,
        description: "Trading volume in the last 24 hours.",
    })
        volume24H?: number

    @Field(() => Float, {
        nullable: true,
        description: "Fees generated in the last 24 hours.",
    })
        fees24H?: number

    @Field(() => Float, {
        nullable: true,
        description: "APR calculated over the last 24 hours.",
    })
        apr24H?: number

    @Field(() => String, {
        nullable: true,
        description: "Total value locked (TVL) of the pool.",
    })
        tvl?: string
}

@ObjectType({
    description: "GraphQL response object for fetching dynamic liquidity pools info.",
})
export class DynamicLiquidityPoolsInfoResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Array<DynamicLiquidityPoolInfo>>
{
    @Field(() => [DynamicLiquidityPoolInfo], {
        nullable: true,
        description: "List of dynamic liquidity pools returned by the query.",
    })
        data: Array<DynamicLiquidityPoolInfo>
}

@InputType({
    description: "Input object for fetching dynamic liquidity pools info.",
})
export class DynamicLiquidityPoolsInfoRequest {
    @Field(() => [GraphQLTypeLiquidityPoolId], {
        nullable: true,
        description: "List of liquidity pool IDs to fetch info for.",
    })
        liquidityPoolIds: Array<LiquidityPoolId>
}