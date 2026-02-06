import {
    Field,
    ObjectType,
} from "@nestjs/graphql"

/** GraphQL type for cursor pagination response (cursor). */
@ObjectType({
    isAbstract: true,
    description: "Response for cursor-based pagination.",
})
export class PaginationCursorResponseData {
    @Field(() => String,
        {
            nullable: true,
            description: "The cursor of the last item from the previous page.",
        })
        cursor?: string
}
