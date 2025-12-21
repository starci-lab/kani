import { Field, ID, InputType, ObjectType } from "@nestjs/graphql"
import { PositionSchema } from "@modules/databases"
import { 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse, 
    IPaginationPageResponseData, 
    PaginationPageResponseData
} from "../../../abstracts"
import { PaginationPageFilters } from "../../../abstracts"

@InputType({
    description: "The request for fetching positions.",
})
export class Positions2PaginationPageFilters extends PaginationPageFilters {
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the positions by timestamp in ascending order.",
    })
        timestampAscending?: boolean
}

@InputType({
    description: "The input type for the cursor for fetching positions.",
})
export class Positions2Request {
    @Field(() => Positions2PaginationPageFilters, {
        description: "The filters for pagination.",
    })
        filters: Positions2PaginationPageFilters
    @Field(() => ID, {
        description: "The ID of the bot to fetch positions for.",
    })
        botId: string
}

@ObjectType({
    description: "The response for fetching positions.",
})
export class Positions2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<PositionSchema> {
    @Field(() => [PositionSchema], {
        description: "Positions.",
    })
        data: Array<PositionSchema>
}   

@ObjectType({
    description: "The response for fetching positions.",
})
export class Positions2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Positions2ResponseData> {
    @Field(() => Positions2ResponseData, {
        description: "The data for the positions.",
    })
        data: Positions2ResponseData
}

export interface Positions2Cursor {
    // the positionOpenedAt of the last record
    timestamp: string
}

