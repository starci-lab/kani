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
} from "../../../abstracts"
import { IAbstractGraphQLResponse } from "../../../abstracts"

/**
 * Represents the asset snapshot of a bot at a specific point in time.
 * Each instance corresponds to the aggregated state derived from the
 * most recent closed position prior to the given timestamp.
 */
@ObjectType({
    isAbstract: true,
    description: "Represents a snapshot of the bot's asset state at a specific timestamp in the history chart.",
})
export class HistoryChartValue {
    /**
     * The normalized balance value of the target asset at this timestamp.
     */
    @Field(() => Float, {
        description: "Normalized value of the target asset at the given timestamp.",
    })
        targetValue: number

    /**
     * The normalized balance value of the quote asset at this timestamp.
     */
    @Field(() => Float, {
        description: "Normalized value of the quote asset at the given timestamp.",
    })
        quoteValue: number

    /**
     * The normalized balance value of the gas asset at this timestamp.
     */
    @Field(() => Float, {
        description: "Normalized value of the gas asset at the given timestamp.",
    })
        gasValue: number
}

/**
 * Represents a single data point in the history time-series.
 * Each series entry maps a timestamp to a corresponding asset snapshot.
 */
@ObjectType({
    description: "A single time-series data point used to render the history line chart.",
})
export class HistoryChartSerie
    extends ChartSerie
    implements IChartSerie<HistoryChartValue>
{
    /**
     * Asset snapshot associated with the series timestamp.
     */
    @Field(() => HistoryChartValue, {
        description: "Asset snapshot representing the bot state at the series timestamp.",
    })
        value: HistoryChartValue
}

/**
 * Response payload containing the complete history time-series of a bot.
 * The series is uniformly sampled based on the requested interval.
 */
@ObjectType({
    description: "Response payload containing time-series history data of a bot.",
})
export class HistoryResponseData
    extends LineChartResponseData
    implements ILineChartResponseData<HistoryChartValue>
{
    /**
     * Ordered list of time-series data points used for chart rendering.
     */
    @Field(() => [HistoryChartSerie], {
        description: "Ordered list of time-series data points covering the requested time range.",
    })
        series: Array<HistoryChartSerie>
}

/**
 * Filtering options defining the time range and sampling interval
 * used to retrieve the bot's history data.
 */
@InputType({
    description: "Filtering options defining the time range and interval for history chart retrieval.",
})
export class HistoryRequestFilters extends LineChartRequestFilters {}

/**
 * Request payload for retrieving the historical chart data of a specific bot.
 */
@InputType({
    description: "Request payload for fetching the history chart data of a specific bot.",
})
export class HistoryRequest {
    /**
     * Time range and interval configuration for the history query.
     */
    @Field(() => HistoryRequestFilters, {
        description: "Time range and interval configuration for fetching the history chart data.",
    })
        filters: HistoryRequestFilters

    /**
     * Unique identifier of the bot whose historical data is being requested.
     */
    @Field(() => ID, {
        description: "Unique identifier of the bot whose history data is requested.",
    })
        botId: string
}

@ObjectType({
    description: "Response payload containing history data of a bot.",
})
export class HistoryResponse extends AbstractGraphQLResponse implements IAbstractGraphQLResponse<HistoryResponseData> {
    @Field(() => HistoryResponseData, {
        description: "History response data.",
    })
        data: HistoryResponseData
}