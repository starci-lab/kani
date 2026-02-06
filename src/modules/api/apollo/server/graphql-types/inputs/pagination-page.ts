import {
    Field,
    InputType,
    Int,
} from "@nestjs/graphql"

/** GraphQL input for page-based pagination (pageNumber, limit). */
@InputType({
    isAbstract: true,
    description: "Input for page-based pagination (pageNumber, limit).",
})
export class PaginationPageFilters {
    @Field(() => Int,
        {
            description: "Page number",
            nullable: true,
        })
        pageNumber?: number
    @Field(() => Int,
        {
            description: "Number of items to fetch per page",
            nullable: true,
        })
        limit?: number
}
