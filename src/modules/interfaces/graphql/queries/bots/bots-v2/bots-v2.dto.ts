import { Field, InputType, ObjectType } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../../abstracts"
import { BotSchema } from "@modules/databases"
import { 
    IPaginationCursorResponseData, 
    PaginationCursorFilters, 
    PaginationCursorResponseData, 
} from "../../../abstracts"

@InputType({
    description: "The request for fetching bots v2.",
})
export class BotsV2PaginationCursorFilters extends PaginationCursorFilters {
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the bots by timestamp in ascending order.",
    })
        timestampAscending?: boolean
}

@InputType({
    description: "The input type for the cursor for fetching bots v2.",
})
export class BotsV2Request {
    @Field(() => BotsV2PaginationCursorFilters, {
        description: "The filters for pagination.",
    })
        filters: BotsV2PaginationCursorFilters
}

@ObjectType({
    description: "The response for fetching bots v2.",
})
export class BotsV2ResponseData
    extends PaginationCursorResponseData
    implements IPaginationCursorResponseData<BotSchema> {
    @Field(() => [BotSchema], {
        description: "Bots.",
    })
        data: Array<BotSchema>
}   

@ObjectType({
    description: "The response for fetching bots v2.",
})
export class BotsV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BotsV2ResponseData> {
    @Field(() => BotsV2ResponseData, {
        description: "The data for the bots.",
    })
        data: BotsV2ResponseData
}

