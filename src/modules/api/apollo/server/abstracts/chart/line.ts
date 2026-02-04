import {
    Field,
    InputType,
    Int,
    ObjectType,
} from "@nestjs/graphql"
import {
    IChartSerie 
} from "./base"
import {
    ChartInterval,
    ChartUnit,
    GraphQLTypeChartInterval,
    GraphQLTypeChartUnit,
} from "@modules/databases"

@ObjectType({
    isAbstract: true,
    description: "Input fields required to paginate results.",
})
export class LineChartResponseData {
    @Field(() => Int,
        {
            description: "The total number of data points in the line chart.",
        })
        count: number
}

export interface ILineChartResponseData<T> {
    count: number
    series: Array<IChartSerie<T>>
}

@InputType({
    description: "The filters for fetching the line chart.",
})
export class LineChartRequestFilters {
    // the unit of the line chart is required
    @Field(() => GraphQLTypeChartUnit,
        {
            description: "The unit of the line chart.",
            defaultValue: ChartUnit.Usd,
        })
        unit: ChartUnit

    // the interval of the line chart is optional
    @Field(() => GraphQLTypeChartInterval,
        {
            description: "The interval of the line chart.",
            defaultValue: ChartInterval.OneHour,
        })
        interval: ChartInterval

    // the from date of the line chart is optional
    @Field(() => Date,
        {
            description: "The from date of the line chart.",
            nullable: true,
        })
        from?: Date

    // the to date of the line chart is optional
    @Field(() => Date,
        {
            description: "The to date of the line chart.",
            nullable: true,
        })
        to?: Date

    // the time zone is optional, default is UTC
    @Field(() => String,
        {
            description: "IANA time zone (e.g. Asia/Ho_Chi_Minh, UTC).",
            nullable: true,
        })
        timeZone?: string
}
