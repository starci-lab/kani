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
    description: "The request for fetching bots.",
})
export class Bots2PaginationPageFilters extends PaginationPageFilters {
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the bots by timestamp in ascending order.",
    })
        timestampAscending?: boolean
}

@InputType({
    description: "The input type for fetching bots.",
})
export class Bots2Request {
    @Field(() => Bots2PaginationPageFilters, {
        description: "The filters for pagination.",
    })
        filters: Bots2PaginationPageFilters
}

@ObjectType({
    description: "The response for fetching bots.",
})
export class Bots2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<BotSchema> {
    @Field(() => [BotSchema], {
        description: "Bots.",
    })
        data: Array<BotSchema>
}   

@ObjectType({
    description: "The response for fetching bots.",
})
export class Bots2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Bots2ResponseData> {
    @Field(() => Bots2ResponseData, {
        description: "The data for the bots.",
    })
        data: Bots2ResponseData
}

