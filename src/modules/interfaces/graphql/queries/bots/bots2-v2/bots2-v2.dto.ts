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
export class Bots2V2PaginationPageFilters extends PaginationPageFilters {
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the bots by timestamp in ascending order.",
    })
        timestampAscending?: boolean
}

@InputType({
    description: "The input type for fetching bots v2.",
})
export class Bots2V2Request {
    @Field(() => Bots2V2PaginationPageFilters, {
        description: "The filters for pagination.",
    })
        filters: Bots2V2PaginationPageFilters
}

@ObjectType({
    description: "The response for fetching bots v2.",
})
export class Bots2V2ResponseData
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
export class Bots2V2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Bots2V2ResponseData> {
    @Field(() => Bots2V2ResponseData, {
        description: "The data for the bots.",
    })
        data: Bots2V2ResponseData
}

