import {
    Field, ObjectType,
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse,
} from "@modules/api"
import {
    BotSchema,
} from "@modules/databases"

/** The GraphQL response for fetching details of a bot. */
@ObjectType({
    description: "The GraphQL response for fetching details of a bot.",
})
export class BotResponse
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
