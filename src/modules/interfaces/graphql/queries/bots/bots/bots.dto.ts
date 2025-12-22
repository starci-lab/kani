import { Field, InputType, ObjectType } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../../abstracts"
import { BotSchema } from "@modules/databases"
import { 
    IPaginationCursorResponseData, 
    PaginationCursorFilters, 
    PaginationCursorResponseData, 
} from "../../../abstracts"

@InputType({
    description: "The request for fetching bots.",
})
export class BotsPaginationCursorFilters extends PaginationCursorFilters {
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the bots by timestamp in ascending order.",
    })
        timestampAscending?: boolean
}

@InputType({
    description: "The input type for the cursor for fetching bots.",
})
export class BotsRequest {
    @Field(() => BotsPaginationCursorFilters, {
        description: "The filters for pagination.",
    })
        filters: BotsPaginationCursorFilters
}

@ObjectType({
    description: "The response for fetching bots.",
})
export class BotsResponseData
    extends PaginationCursorResponseData
    implements IPaginationCursorResponseData<BotSchema> {
    @Field(() => [BotSchema], {
        description: "Bots.",
    })
        data: Array<BotSchema>
}   

@ObjectType({
    description: "The response for fetching bots.",
})
export class BotsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BotsResponseData> {
    @Field(() => BotsResponseData, {
        description: "The data for the bots.",
    })
        data: BotsResponseData
}

export interface BotsCursor {
    // the createdAt of the last record
    timestamp: string
}

