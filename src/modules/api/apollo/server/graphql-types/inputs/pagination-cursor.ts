import {
    Field,
    InputType,
    Int,
} from "@nestjs/graphql"

/** GraphQL input for cursor pagination request id. */
@InputType({
    isAbstract: true,
    description: "Input for cursor pagination request id.",
})
export class PaginationCursorRequest {
    @Field(() => String,
        {
            description: "The request id for the pagination.",
        })
        requestId: string
}

/** GraphQL input for cursor + limit. */
@InputType({
    isAbstract: true,
    description: "Input for cursor pagination (cursor, limit).",
})
export class PaginationCursorFilters {
    @Field({
        nullable: true,
        description:
            "Cursor of the last item from previous page (e.g., ID or timestamp)",
    })
        cursor?: string
    @Field(() => Int,
        {
            defaultValue: 10,
            description: "Number of items to fetch per page",
        })
        limit?: number
}
