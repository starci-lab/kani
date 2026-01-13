import { Field, InputType, ObjectType } from "@nestjs/graphql"
import { BotSchema } from "@modules/databases"
import { 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse, 
    IPaginationPageResponseData, 
    PaginationPageResponseData
} from "../../../abstracts"
import { PaginationPageFilters } from "../../../abstracts"

@InputType({
    description: "The request for fetching bots v2.",
})
export class BotsV2PaginationFilters extends PaginationPageFilters {
    @Field(() => Boolean, {
        nullable: true,
        description: "Whether to sort the bots by timestamp in ascending order.",
    })
        asc?: boolean
}

@InputType({
    description: "The input type for fetching bots v2.",
})
export class BotsV2Request {
    @Field(() => BotsV2PaginationFilters, {
        description: "The filters for pagination.",
    })
        filters: BotsV2PaginationFilters
}

@ObjectType({
    description: "The response for fetching bots v2.",
})
export class BotsV2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<BotSchema> {
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

