import { Field, InputType, Int, ObjectType } from "@nestjs/graphql"

@InputType({
    isAbstract: true,
    description: "Input fields required to paginate results.",
})
export class PaginationPageFilters {
  @Field(() => Int, {
      defaultValue: 1,
      description: "Page number",
  })
      pageNumber: number
  @Field(() => Int, {
      defaultValue: 10,
      description: "Number of items to fetch per page",
  })
      limit: number
}

@ObjectType({
    isAbstract: true,
    description: "The response for pagination.",
})
export class PaginationPageResponseData {
    @Field(() => Int, {
        description: "The total number of items.",
    })
        count: number
}

export interface IPaginationPageResponseData<T = unknown> {
    count: number
    data: Array<T>
}