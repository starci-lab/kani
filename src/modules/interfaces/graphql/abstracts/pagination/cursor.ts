import { Field, InputType, Int, ObjectType } from "@nestjs/graphql"

@InputType({
    isAbstract: true,
    description: "Input fields required to paginate results.",
})
export class PaginationCursorFilters {
  @Field({
      nullable: true,
      description: "Cursor of the last item from previous page (e.g., ID or timestamp)",
  })
      cursor?: string
  @Field(() => Int, {
      defaultValue: 10,
      description: "Number of items to fetch per page",
  })
      limit?: number
}

@ObjectType({
    isAbstract: true,
    description: "The response for pagination.",
})
export class PaginationCursorResponseData {
    @Field(() => String, {
        nullable: true,
        description: "The cursor of the last item from the previous page.",
    })
        cursor?: string
}

export interface IPaginationCursorResponseData<T = unknown> {
    cursor?: string
    data: Array<T>
}