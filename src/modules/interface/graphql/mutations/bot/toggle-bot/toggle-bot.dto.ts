import {
    InputType, Field, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "@modules/api"

@InputType({
    description: "Input payload used to start or stop a bot.",
})
export class ToggleBotRequest {
    @Field(() => String,
        {
            description: "Unique identifier of the bot whose running state will be changed.",
        })
        id: string

    @Field(() => Boolean,
        {
            description: "Desired running state of the bot. `true` to start, `false` to stop.",
        })
        running: boolean
}


@ObjectType({
    description:
        "Standard GraphQL response returned after toggling a bot's running state.",
})
export class ToggleBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}