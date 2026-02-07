import {
    Field, InputType,
} from "@nestjs/graphql"
import {
    PaginationPageFilters,
} from "@modules/api"
import {
    GraphQLTypeLiquidityPoolsSortBy,
    LiquidityPoolsSortBy,
} from "../enums"

/** The request for fetching liquidity pools. */
@InputType({
    description: "The request for fetching liquidity pools.",
})
export class LiquidityPoolsPaginationPageFilters extends PaginationPageFilters {
    @Field(() => [String],
        {
            nullable: true,
            description: "The token ids to filter by.",
        })
        tokenIds?: Array<string>
    @Field(() => [String],
        {
            description: "The pool ids.",
            nullable: true,
        })
        ids?: Array<string>

    @Field(() => [String],
        {
            description: "The DEX ids.",
            nullable: true,
        })
        dexIds?: Array<string>
    @Field(() => [String],
        {
            description: "The pool addresses.",
            nullable: true,
        })
        addresses?: Array<string>
    @Field(() => GraphQLTypeLiquidityPoolsSortBy,
        {
            description: "The field to sort the liquidity pools by.",
            nullable: true,
        })
        sortBy?: LiquidityPoolsSortBy
    @Field(() => Boolean,
        {
            defaultValue: false,
            description: "Whether to sort the liquidity pools in ascending order.",
        })
        asc?: boolean
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to include watchlist liquidity pools.",
        })
        watchlist?: boolean
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to include incentivized liquidity pools.",
        })
        incentivized?: boolean
}

/** The request for fetching liquidity pools. */
@InputType({
    description: "The request for fetching liquidity pools.",
})
export class LiquidityPoolsRequest {
    @Field(() => LiquidityPoolsPaginationPageFilters,
        {
            description: "The filters for pagination.",
        })
        filters: LiquidityPoolsPaginationPageFilters
}
