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

/** The response for fetching positions. */
@ObjectType({
    description: "The response for fetching positions.",
})
export class PositionsResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<PositionSchema>
{
    @Field(() => [PositionSchema],
        {
            description: "Positions.",
        })
    data: Array<PositionSchema>
}

/** The response for fetching positions. */
@ObjectType({
    description: "The response for fetching positions.",
})
export class PositionsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<PositionsResponseData>
{
    @Field(() => PositionsResponseData,
        {
            description: "The data for the positions.",
        })
    data: PositionsResponseData
}
