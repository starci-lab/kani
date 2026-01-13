import { ObjectType, Field, InputType, registerEnumType } from "@nestjs/graphql"
import { 
    LiquidityPoolSchema 
} from "@modules/databases"
import {
    AbstractGraphQLResponse,
    IAbstractGraphQLResponse,
    IPaginationPageResponseData,
    PaginationPageFilters,
    PaginationPageResponseData
} from "../../../abstracts"
import { createEnumType } from "@utils"

export enum LiquidityPoolsSortBy {
    Apr = "apr",
    Volume = "volume",
    Fees = "fees",
    Liquidity = "liquidity",
}
export const GraphQLTypeLiquidityPoolsSortBy = createEnumType(LiquidityPoolsSortBy)

registerEnumType(GraphQLTypeLiquidityPoolsSortBy, {
    name: "LiquidityPoolsSortBy",
    description: "The field to sort the liquidity pools by.",
    valuesMap: {
        [LiquidityPoolsSortBy.Apr]: {
            description: "The APR of the liquidity pool.",
        },
        [LiquidityPoolsSortBy.Volume]: {
            description: "The volume of the liquidity pool.",
        },
        [LiquidityPoolsSortBy.Fees]: {
            description: "The fees of the liquidity pool.",
        },
        [LiquidityPoolsSortBy.Liquidity]: {
            description: "The liquidity of the liquidity pool.",
        },
    },
})
@InputType({
    description: "The request for fetching liquidity pools.",
})
export class LiquidityPoolsPaginationPageFilters extends PaginationPageFilters {
    @Field(() => [String], {
        nullable: true,
        description: "The token ids to filter by.",
    })
        tokenIds?: Array<string>
    @Field(() => [String], {
        description: "The pool ids.",
        nullable: true,
    })
        ids?: Array<string>

    @Field(() => [String], {
        description: "The DEX ids.",
        nullable: true,
    })
        dexIds?: Array<string>
    @Field(() => [String], {
        description: "The pool addresses.",
        nullable: true,
    })
        addresses?: Array<string>
    @Field(() => GraphQLTypeLiquidityPoolsSortBy, {
        description: "The field to sort the liquidity pools by.",
        nullable: true,
    })
        sortBy?: LiquidityPoolsSortBy
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
    description: "The request for fetching liquidity pools.",
})
export class LiquidityPoolsRequest {
    @Field(() => LiquidityPoolsPaginationPageFilters, {
        description: "The filters for pagination.",
    })
        filters: LiquidityPoolsPaginationPageFilters
}

@ObjectType({
    description: "The response for fetching liquidity pools.",
})
export class LiquidityPoolsResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<LiquidityPoolSchema> {
    @Field(() => [LiquidityPoolSchema], {
        description: "Liquidity pools.",
    })
        data: Array<LiquidityPoolSchema>
}
/**
 * GraphQL response type for the liquidity pools query.
 */
@ObjectType({
    description: "GraphQL response object for fetching liquidity pools.",
})
export class LiquidityPoolsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<LiquidityPoolsResponseData> {
    @Field(() => LiquidityPoolsResponseData, {
        description: "The data for the liquidity pools.",
        nullable: true,
    })
        data: LiquidityPoolsResponseData
}

