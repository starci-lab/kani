import {
    Field, InputType,
} from "@nestjs/graphql"
import {
    PaginationPageFilters,
} from "@modules/api"

/** The request for fetching bots. */
@InputType({
    description: "The request for fetching bots.",
})
export class BotsPaginationFilters extends PaginationPageFilters {
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to sort the bots by timestamp in ascending order.",
        })
    asc?: boolean
}

/** The input type for fetching bots. */
@InputType({
    description: "The input type for fetching bots.",
})
export class BotsRequest {
    @Field(() => BotsPaginationFilters,
        {
            description: "The filters for pagination.",
        })
    filters: BotsPaginationFilters
}
