import {
    Field, Float, ObjectType,
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse,
    ChartSerie,
    IAbstractGraphQLResponse,
    IChartSerie,
    ILineChartResponseData,
    LineChartResponseData,
} from "@modules/api"

/** A single time-series data point used to render the bot history line chart v2. */
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

/** Time-series history data of a bot v2, formatted for line chart visualization. */
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

/** GraphQL response payload containing historical time-series data of a bot v2. */
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
