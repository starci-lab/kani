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
export class BotsPaginationFilters extends PaginationPageFilters {
    @Field(() => Boolean, {
        nullable: true,
        description: "Whether to sort the bots by timestamp in ascending order.",
    })
        asc?: boolean
}

@InputType({
    description: "The input type for fetching bots.",
})
export class BotsRequest {
    @Field(() => BotsPaginationFilters, {
        description: "The filters for pagination.",
    })
        filters: BotsPaginationFilters
}

@ObjectType({
    description: "The response for fetching bots.",
})
export class BotsResponseData
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
export class BotsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BotsResponseData> {
    @Field(() => BotsResponseData, {
        description: "The data for the bots.",
    })
        data: BotsResponseData
}

