import {
    Field, ID, InputType,
} from "@nestjs/graphql"
import {
    LineChartRequestFilters,
} from "@modules/api"

/** Filtering options defining the time range and interval for history chart retrieval v2. */
@InputType({
    description: "Filtering options defining the time range and interval for history chart retrieval v2.",
})
export class HistoryV2RequestFilters extends LineChartRequestFilters {}

/** Request payload for fetching historical chart data of a specific bot v2. */
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
