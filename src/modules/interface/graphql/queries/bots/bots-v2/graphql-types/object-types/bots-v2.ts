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

/** The response for fetching bots v2. */
@ObjectType({
    description: "The response for fetching bots v2.",
})
export class BotsV2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<BotSchema>
{
    @Field(() => [BotSchema],
        {
            description: "Bots.",
        })
    data: Array<BotSchema>
}

/** The response for fetching bots v2. */
@ObjectType({
    description: "The response for fetching bots v2.",
})
export class BotsV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BotsV2ResponseData>
{
    @Field(() => BotsV2ResponseData,
        {
            description: "The data for the bots.",
            nullable: true,
        })
    data?: BotsV2ResponseData
}
