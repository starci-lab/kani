import {
    Field,
    ObjectType,
} from "@nestjs/graphql"

/** GraphQL type for a chart series point (timestamp). */
@ObjectType({
    isAbstract: true,
    description: "A single point in a chart series (timestamp).",
})
export class ChartSerie {
    @Field(() => Date,
        {
            description: "The timestamp of the serie.",
        })
        timestamp: Date
}
