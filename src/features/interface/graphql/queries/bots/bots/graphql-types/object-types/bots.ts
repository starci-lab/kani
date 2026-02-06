import {
    Field, ObjectType,
} from "@nestjs/graphql"
import {
    BotSchema,
} from "@modules/databases"
import {
    AbstractGraphQLResponse,
    IAbstractGraphQLResponse,
    IPaginationPageResponseData,
    PaginationPageResponseData,
} from "@modules/api"

/** The response for fetching bots. */
@ObjectType({
    description: "The response for fetching bots.",
})
export class BotsResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<BotSchema>
{
    @Field(() => [BotSchema],
        {
            description: "Bots.",
        })
    data: Array<BotSchema>
}

/** The response for fetching bots. */
@ObjectType({
    description: "The response for fetching bots.",
})
export class BotsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BotsResponseData>
{
    @Field(() => BotsResponseData,
        {
            description: "The data for the bots.",
        })
    data: BotsResponseData
}
