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

/** A single time-series data point used to render the bot history line chart. */
@ObjectType({
    description: "A single time-series data point used to render the bot history line chart.",
})
export class HistoryChartSerie
    extends ChartSerie
    implements IChartSerie<number>
{
    @Field(() => Float,
        {
            description: "Aggregated position value snapshot at the series timestamp.",
        })
    value: number
}

/** Time-series response payload representing the historical performance of a bot. */
@ObjectType({
    description: "Time-series history data of a bot, formatted for line chart visualization.",
})
export class HistoryResponseData
    extends LineChartResponseData
    implements ILineChartResponseData<number>
{
    @Field(() => [HistoryChartSerie],
        {
            description: "Chronologically ordered time-series data points covering the requested range.",
        })
    series: Array<HistoryChartSerie>
}

/** GraphQL response wrapper for bot history queries. */
@ObjectType({
    description: "GraphQL response payload containing historical time-series data of a bot.",
})
export class HistoryResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<HistoryResponseData>
{
    @Field(() => HistoryResponseData,
        {
            description: "Time-series history data of the bot.",
            nullable: true,
        })
    data?: HistoryResponseData
}
