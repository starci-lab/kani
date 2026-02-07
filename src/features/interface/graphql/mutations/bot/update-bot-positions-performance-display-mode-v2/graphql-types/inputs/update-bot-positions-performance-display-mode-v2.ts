import {
    InputType, Field
} from "@nestjs/graphql"
import {
    GraphQLTypePerformanceDisplayMode, PerformanceDisplayMode
} from "@modules/databases"

@InputType({
    description: "Input payload used to update the positions performance display mode of a bot v2.",
})
export class UpdateBotPositionsPerformanceDisplayModeV2Request {
    @Field(() => String,
        {
            description: "Unique identifier of the bot whose positions performance display mode will be updated.",
        })
        id: string

    @Field(() => GraphQLTypePerformanceDisplayMode,
        {
            description: "Desired positions performance display mode of the bot. `target` to display in target units, `usd` to display in USD units.",
        })
        positionsPerformanceDisplayMode: PerformanceDisplayMode
}
