import {
    Field, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"
import {
    BotSchema 
} from "@modules/databases"

@InputType({
    description: "Input fields required to fetch a bot v2.",
})
export class BotV2Request {
    @Field(() => String,
        {
            description: "The unique ID of the bot.",
        })
        id: string
}

@ObjectType({
    description: "The GraphQL response for fetching details of a bot v2.",
})
export class BotV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BotSchema> {
    @Field(() => BotSchema,
        {
            nullable: true,
            description: "The bot data, if the request is successful.",
        })
        data?: BotSchema
}

