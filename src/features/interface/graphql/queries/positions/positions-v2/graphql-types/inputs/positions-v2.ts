import {
    Field, ID, InputType,
} from "@nestjs/graphql"
import {
    PaginationPageFilters,
} from "@modules/api"

/** Options to specify which related entities should be associated with bots v2. */
@InputType({
    description: "Options to specify which related entities should be associated with bots v2.",
})
export class PositionsV2AssociateOptions {
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to associate the liquidity pool data with each position.",
        })
        liquidityPool?: boolean
}

/** The request for fetching positions v2. */
@InputType({
    description: "The request for fetching positions v2.",
})
export class PositionsV2PaginationFilters extends PaginationPageFilters {
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to sort the positions by createdAt in ascending order.",
        })
        asc?: boolean
}

/** The input type for the cursor for fetching positions v2. */
@InputType({
    description: "The input type for the cursor for fetching positions v2.",
})
export class PositionsV2Request {
    @Field(() => PositionsV2PaginationFilters,
        {
            description: "The filters for pagination.",
        })
        filters: PositionsV2PaginationFilters
    @Field(() => ID,
        {
            description: "The ID of the bot to fetch positions for.",
        })
        botId: string
    @Field(() => PositionsV2AssociateOptions,
        {
            description: "The options to associate with the positions.",
            nullable: true,
        })
        associate?: PositionsV2AssociateOptions
}
