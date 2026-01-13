import { Field, ID, InputType, ObjectType } from "@nestjs/graphql"
import { PositionSchema } from "@modules/databases"
import { 
    IPaginationCursorResponseData, 
    PaginationCursorFilters, 
    PaginationCursorResponseData, 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse 
} from "../../../abstracts"

@InputType({
    description: "The request for fetching positions.",
})
export class PositionsPaginationCursorFilters extends PaginationCursorFilters {
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the positions by positionOpenedAt in ascending order.",
    })
        asc?: boolean
}

@InputType({
    description: "The input type for the cursor for fetching positions.",
})
export class PositionsRequest {
    @Field(() => PositionsPaginationCursorFilters, {
        description: "The filters for pagination.",
    })
        filters: PositionsPaginationCursorFilters
    @Field(() => ID, {
        description: "The ID of the bot to fetch positions for.",
    })
        botId: string
}

@ObjectType({
    description: "The response for fetching positions.",
})
export class PositionsResponseData
    extends PaginationCursorResponseData
    implements IPaginationCursorResponseData<PositionSchema> {
    @Field(() => [PositionSchema], {
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
    @Field(() => PositionsResponseData, {
        description: "The data for the positions.",
    })
        data: PositionsResponseData
}

export interface PositionsCursor {
    // the positionOpenedAt of the last record
    timestamp: string
}

