import {
    Field,
    Float,
    ID,
    InputType,
    ObjectType,
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse,
    ChartSerie,
    IChartSerie,
    ILineChartResponseData,
    LineChartRequestFilters,
    LineChartResponseData,
    IAbstractGraphQLResponse,
} from "@modules/api"

@ObjectType({
    description: "A single time-series data point used to render the bot history line chart v2.",
})
export class HistoryV2ChartSerie
    extends ChartSerie
    implements IChartSerie<number>
{
    @Field(() => Float,
        {
            description: "Aggregated position value snapshot at the series timestamp.",
        })
        value: number
}

@ObjectType({
    description: "Time-series history data of a bot v2, formatted for line chart visualization.",
})
export class HistoryV2ResponseData
    extends LineChartResponseData
    implements ILineChartResponseData<number>
{
    @Field(() => [HistoryV2ChartSerie],
        {
            description: "Chronologically ordered time-series data points covering the requested range.",
        })
        series: Array<HistoryV2ChartSerie>
}

@InputType({
    description: "Filtering options defining the time range and interval for history chart retrieval v2.",
})
export class HistoryV2RequestFilters extends LineChartRequestFilters {}

@InputType({
    description: "Request payload for fetching historical chart data of a specific bot v2.",
})
export class HistoryV2Request {
    @Field(() => HistoryV2RequestFilters,
        {
            description: "Time range and interval configuration for fetching history chart data.",
        })
        filters: HistoryV2RequestFilters

    @Field(() => ID,
        {
            description: "Unique identifier of the bot whose history data is requested.",
        })
        botId: string
}

@ObjectType({
    description: "GraphQL response payload containing historical time-series data of a bot v2.",
})
export class HistoryV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<HistoryV2ResponseData>
{
    @Field(() => HistoryV2ResponseData,
        {
            description: "Time-series history data of the bot.",
            nullable: true,
        })
        data?: HistoryV2ResponseData
}

