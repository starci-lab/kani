import {
    InputType, Field, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "@modules/api"
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


@ObjectType({
    description:
        "Standard GraphQL response returned after updating a bot's positions performance display mode v2.",
})
export class UpdateBotPositionsPerformanceDisplayModeV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
