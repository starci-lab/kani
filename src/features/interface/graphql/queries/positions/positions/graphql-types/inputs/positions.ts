import {
    Field, ID, InputType,
} from "@nestjs/graphql"
import {
    PaginationPageFilters,
} from "@modules/api"

/** The request for fetching positions. */
@InputType({
    description: "The request for fetching positions.",
})
export class PositionsPaginationFilters extends PaginationPageFilters {
    @Field(() => Boolean,
        {
            defaultValue: false,
            description: "Whether to sort the positions in ascending order.",
        })
        asc?: boolean
}

/** The input type for the cursor for fetching positions. */
@InputType({
    description: "The input type for the cursor for fetching positions.",
})
export class PositionsRequest {
    @Field(() => PositionsPaginationFilters,
        {
            description: "The filters for pagination.",
        })
        filters: PositionsPaginationFilters
    @Field(() => ID,
        {
            description: "The ID of the bot to fetch positions for.",
        })
        botId: string
}
