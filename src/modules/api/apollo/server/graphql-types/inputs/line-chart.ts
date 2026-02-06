import {
    Field,
    InputType,
} from "@nestjs/graphql"
import {
    ChartInterval,
    ChartUnit,
    GraphQLTypeChartInterval,
    GraphQLTypeChartUnit,
} from "@modules/databases"

/** GraphQL input for line chart filters (unit, interval, from, to, timeZone). */
@InputType({
    isAbstract: true,
    description: "Filters for fetching the line chart.",
})
export class LineChartRequestFilters {
    @Field(() => GraphQLTypeChartUnit,
        {
            description: "The unit of the line chart.",
            defaultValue: ChartUnit.Usd,
        })
        unit: ChartUnit

    @Field(() => GraphQLTypeChartInterval,
        {
            description: "The interval of the line chart.",
            defaultValue: ChartInterval.OneHour,
        })
        interval: ChartInterval

    @Field(() => Date,
        {
            description: "The from date of the line chart.",
            nullable: true,
        })
        from?: Date

    @Field(() => Date,
        {
            description: "The to date of the line chart.",
            nullable: true,
        })
        to?: Date

    @Field(() => String,
        {
            description: "IANA time zone (e.g. Asia/Ho_Chi_Minh, UTC).",
            nullable: true,
        })
        timeZone?: string
}
