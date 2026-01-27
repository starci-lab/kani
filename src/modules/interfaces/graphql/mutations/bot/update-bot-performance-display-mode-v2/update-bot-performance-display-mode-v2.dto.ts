import {
    InputType, Field, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"
import {
    GraphQLTypePerformanceDisplayMode, PerformanceDisplayMode 
} from "@modules/databases"

@InputType({
    description: "Input payload used to update the performance display mode of a bot v2.",
})
export class UpdateBotPerformanceDisplayModeV2Request {
    @Field(() => String,
        {
            description: "Unique identifier of the bot whose performance display mode will be updated.",
        })
        id: string

    @Field(() => GraphQLTypePerformanceDisplayMode,
        {
            description: "Desired performance display mode of the bot. `target` to display in target units, `usd` to display in USD units.",
        })
        performanceDisplayMode: PerformanceDisplayMode
}


@ObjectType({
    description:
        "Standard GraphQL response returned after updating a bot's performance display mode v2.",
})
export class UpdateBotPerformanceDisplayModeV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
