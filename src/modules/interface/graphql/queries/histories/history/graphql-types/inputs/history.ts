import {
    Field, ID, InputType,
} from "@nestjs/graphql"
import {
    LineChartRequestFilters,
} from "@modules/api"

/** Filtering options defining the time range and interval for history chart retrieval. */
@InputType({
    description: "Filtering options defining the time range and interval for history chart retrieval.",
})
export class HistoryRequestFilters extends LineChartRequestFilters {}

/** Request payload for retrieving a bot's historical chart data. */
@InputType({
    description: "Request payload for fetching historical chart data of a specific bot.",
})
export class HistoryRequest {
    @Field(() => HistoryRequestFilters,
        {
            description: "Time range and interval configuration for fetching history chart data.",
        })
    filters: HistoryRequestFilters

    @Field(() => ID,
        {
            description: "Unique identifier of the bot whose history data is requested.",
        })
    botId: string
}
