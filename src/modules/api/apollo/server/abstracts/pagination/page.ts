import {
    Field, InputType, Int, ObjectType 
} from "@nestjs/graphql"

@InputType({
    isAbstract: true,
    description: "Input fields required to paginate results.",
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

@ObjectType({
    isAbstract: true,
    description: "The response for pagination.",
})
export class PaginationPageResponseData {
    @Field(() => Int,
        {
            description: "The total number of items.",
        })
        count: number
}

export interface IPaginationPageResponseData<T = unknown> {
    count: number
    data: Array<T>
}
