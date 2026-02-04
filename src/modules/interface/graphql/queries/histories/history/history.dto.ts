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

/**
 * Represents a single point in the bot's historical time-series.
 *
 * Each series item corresponds to a sampled timestamp (bucket)
 * and contains the aggregated position value snapshot at that time.
 *
 * This object is used directly by line chart components
 * to render the bot's historical performance.
 */
@ObjectType({
    description: "A single time-series data point used to render the bot history line chart.",
})
export class HistoryChartSerie
    extends ChartSerie
    implements IChartSerie<number>
{
    /**
     * Aggregated position value at the given timestamp.
     *
     * This value represents the bot's position value snapshot
     * after the most recent closed position within the interval.
     */
    @Field(() => Float,
        {
            description: "Aggregated position value snapshot at the series timestamp.",
        })
        value: number
}

/**
 * Time-series response payload representing the historical performance of a bot.
 *
 * The series is uniformly sampled according to the requested interval
 * and ordered chronologically from oldest to newest,
 * making it suitable for direct visualization in line charts.
 */
@ObjectType({
    description: "Time-series history data of a bot, formatted for line chart visualization.",
})
export class HistoryResponseData
    extends LineChartResponseData
    implements ILineChartResponseData<number>
{
    /**
     * Chronologically ordered list of time-series data points.
     *
     * Each item represents the bot's aggregated position value
     * at a specific point in time.
     */
    @Field(() => [HistoryChartSerie],
        {
            description: "Chronologically ordered time-series data points covering the requested range.",
        })
        series: Array<HistoryChartSerie>
}

/**
 * Filtering options used to define how the bot's history data is sampled.
 *
 * Includes:
 * - Time range (`from`, `to`)
 * - Sampling interval (e.g. 1m, 5m, 1h)
 * - Optional timezone configuration
 *
 * These filters control both the resolution and scope
 * of the returned history time-series.
 */
@InputType({
    description: "Filtering options defining the time range and interval for history chart retrieval.",
})
export class HistoryRequestFilters extends LineChartRequestFilters {}

/**
 * Request payload for retrieving a bot's historical chart data.
 *
 * Combines the target bot identifier with
 * time range and interval filtering options.
 */
@InputType({
    description: "Request payload for fetching historical chart data of a specific bot.",
})
export class HistoryRequest {
    /**
     * Time range and interval configuration used to sample the history series.
     */
    @Field(() => HistoryRequestFilters,
        {
            description: "Time range and interval configuration for fetching history chart data.",
        })
        filters: HistoryRequestFilters

    /**
     * Unique identifier of the bot whose historical data is requested.
     */
    @Field(() => ID,
        {
            description: "Unique identifier of the bot whose history data is requested.",
        })
        botId: string
}

/**
 * GraphQL response wrapper for bot history queries.
 *
 * Wraps the history time-series data inside
 * a standard GraphQL response structure,
 * including metadata such as success state or errors.
 */
@ObjectType({
    description: "GraphQL response payload containing historical time-series data of a bot.",
})
export class HistoryResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<HistoryResponseData>
{
    /**
     * Time-series history data of the requested bot.
     */
    @Field(() => HistoryResponseData,
        {
            description: "Time-series history data of the bot.",
            nullable: true,
        })
        data?: HistoryResponseData
}
