import {
    Field, ObjectType,
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse,
} from "@modules/api"
import {
    BotSchema,
} from "@modules/databases"

/** The GraphQL response for fetching details of a bot v2. */
@ObjectType({
    description: "The GraphQL response for fetching details of a bot v2.",
})
export class BotV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BotSchema>
{
    @Field(() => BotSchema,
        {
            nullable: true,
            description: "The bot data, if the request is successful.",
        })
    data?: BotSchema
}
