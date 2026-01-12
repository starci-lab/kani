import { ObjectType, Field, InputType, registerEnumType } from "@nestjs/graphql"
import { DexId, GraphQLTypeDexId, GraphQLTypeLiquidityPoolId, GraphQLTypeTokenId, LiquidityPoolId, LiquidityPoolSchema, TokenId } from "@modules/databases"
import { 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse, 
    IPaginationPageResponseData, 
    PaginationPageFilters, 
    PaginationPageResponseData
} from "../../../abstracts"
import { createEnumType } from "@utils"


export enum LiquidityPools2SortBy {
    Apr = "apr",
    Volume = "volume",
    Fees = "fees",
    Liquidity = "liquidity",
}
export const GraphQLTypeLiquidityPools2SortBy = createEnumType(LiquidityPools2SortBy)

registerEnumType(GraphQLTypeLiquidityPools2SortBy, {
    name: "LiquidityPools2SortBy",
    description: "The field to sort the liquidity pools by.",
    valuesMap: {
        [LiquidityPools2SortBy.Apr]: {
            description: "The APR of the liquidity pool.",
        },
        [LiquidityPools2SortBy.Volume]: {
            description: "The volume of the liquidity pool.",
        },
        [LiquidityPools2SortBy.Fees]: {
            description: "The fees of the liquidity pool.",
        },
        [LiquidityPools2SortBy.Liquidity]: {
            description: "The liquidity of the liquidity pool.",
        },
    },
})
@InputType({
    description: "The request for fetching liquidity pools2.",
})
export class LiquidityPools2PaginationPageFilters extends PaginationPageFilters {
    @Field(() => [GraphQLTypeTokenId], {
        nullable: true,
        description: "The token ids to filter by.",
    })
        tokenIds?: Array<TokenId>
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
    
    @Field(() => [GraphQLTypeDexId], {
        description: "The DEX ids.",
        nullable: true,
    })
        dexIds?: Array<DexId>
    @Field(() => [String], {
        description: "The pool addresses.",
        nullable: true,
    })
        addresses?: Array<string>
    @Field(() => GraphQLTypeLiquidityPools2SortBy, {
        description: "The field to sort the liquidity pools by.",
        nullable: true,
    })
        sortBy?: LiquidityPools2SortBy
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the liquidity pools in ascending order.",
    })
        asc?: boolean
        @Field(() => Boolean, {
            nullable: true,
            description: "Whether to include watchlist liquidity pools.",
        })
            watchlist?: boolean
        @Field(() => Boolean, {
            nullable: true,
            description: "Whether to include incentivized liquidity pools.",
        })
            incentivized?: boolean
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

