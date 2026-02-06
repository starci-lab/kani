import {
    Field, ObjectType,
} from "@nestjs/graphql"
import {
    PositionSchema,
} from "@modules/databases"
import {
    AbstractGraphQLResponse,
    IAbstractGraphQLResponse,
    IPaginationPageResponseData,
    PaginationPageResponseData,
} from "@modules/api"

/** The response for fetching positions v2. */
@ObjectType({
    description: "The response for fetching positions v2.",
})
export class PositionsV2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<PositionSchema>
{
    @Field(() => [PositionSchema],
        {
            description: "Positions.",
        })
    data: Array<PositionSchema>
}

/** The response for fetching positions v2. */
@ObjectType({
    description: "The response for fetching positions v2.",
})
export class PositionsV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<PositionsV2ResponseData>
{
    @Field(() => PositionsV2ResponseData,
        {
            description: "The data for the positions.",
        })
    data: PositionsV2ResponseData
}
