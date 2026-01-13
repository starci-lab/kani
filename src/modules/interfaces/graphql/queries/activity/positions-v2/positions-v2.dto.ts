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
    description: "The request for fetching positions v2.",
})
export class PositionsV2PaginationCursorFilters extends PaginationCursorFilters {
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the positions by positionOpenedAt in ascending order.",
    })
        asc?: boolean
}

@InputType({
    description: "The input type for the cursor for fetching positions v2.",
})
export class PositionsV2Request {
    @Field(() => PositionsV2PaginationCursorFilters, {
        description: "The filters for pagination.",
    })
        filters: PositionsV2PaginationCursorFilters
    @Field(() => ID, {
        description: "The ID of the bot to fetch positions for.",
    })
        botId: string
}

@ObjectType({
    description: "The response for fetching positions v2.",
})
export class PositionsV2ResponseData
    extends PaginationCursorResponseData
    implements IPaginationCursorResponseData<PositionSchema> {
    @Field(() => [PositionSchema], {
        description: "Positions.",
    })
        data: Array<PositionSchema>
}   

@ObjectType({
    description: "The response for fetching positions v2.",
})
export class PositionsV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<PositionsV2ResponseData> {
    @Field(() => PositionsV2ResponseData, {
        description: "The data for the positions.",
    })
        data: PositionsV2ResponseData
}

export interface PositionsV2Cursor {
    // the positionOpenedAt of the last record
    timestamp: string
}

