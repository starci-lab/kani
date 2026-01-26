import {
    Field, ID, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    PositionSchema 
} from "@modules/databases"
import { 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse, 
    IPaginationPageResponseData, 
    PaginationPageResponseData
} from "../../../abstracts"
import {
    PaginationPageFilters 
} from "../../../abstracts"

@InputType({
    description: "The request for fetching positions.",
})
export class PositionsPaginationFilters extends PaginationPageFilters {
    @Field(() => Boolean,
        {
            defaultValue: false,
            description: "Whether to sort the positions in ascending order.",
        })
        asc?: boolean
}

@InputType({
    description: "The input type for the cursor for fetching positions.",
})
export class PositionsRequest {
    @Field(() => PositionsPaginationFilters,
        {
            description: "The filters for pagination.",
        })
        filters: PositionsPaginationFilters
    @Field(() => ID,
        {
            description: "The ID of the bot to fetch positions for.",
        })
        botId: string
}

@ObjectType({
    description: "The response for fetching positions.",
})
export class PositionsResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<PositionSchema> {
    @Field(() => [PositionSchema],
        {
            description: "Positions.",
        })
        data: Array<PositionSchema>
}   

@ObjectType({
    description: "The response for fetching positions.",
})
export class PositionsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<PositionsResponseData> {
    @Field(() => PositionsResponseData,
        {
            description: "The data for the positions.",
        })
        data: PositionsResponseData
}

