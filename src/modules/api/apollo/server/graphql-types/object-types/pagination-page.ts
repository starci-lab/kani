import {
    Field,
    Int,
    ObjectType,
} from "@nestjs/graphql"

/** GraphQL type for page pagination response (count). */
@ObjectType({
    isAbstract: true,
    description: "Response for page-based pagination.",
})
export class PaginationPageResponseData {
    @Field(() => Int,
        {
            description: "The total number of items.",
        })
        count: number
}
