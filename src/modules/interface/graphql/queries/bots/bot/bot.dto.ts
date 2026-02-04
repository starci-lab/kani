import {
    Field, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "@modules/api"
import {
    BotSchema 
} from "@modules/databases"

@InputType({
    description: "Input fields required to fetch a bot.",
})
export class BotRequest {
    @Field(() => String,
        {
            description: "The unique ID of the bot.",
        })
        id: string
}

@ObjectType({
    description: "The GraphQL response for fetching details of a bot.",
})
export class BotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BotSchema> {
    @Field(() => BotSchema,
        {
            nullable: true,
            description: "The bot data, if the request is successful.",
        })
        data?: BotSchema
}

