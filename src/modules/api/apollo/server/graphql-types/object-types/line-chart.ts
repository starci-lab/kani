import {
    Field,
    Int,
    ObjectType,
} from "@nestjs/graphql"

/** GraphQL type for line chart response (count). */
@ObjectType({
    isAbstract: true,
    description: "Response data for line chart (count of data points).",
})
export class LineChartResponseData {
    @Field(() => Int,
        {
            description: "The total number of data points in the line chart.",
        })
        count: number
}
