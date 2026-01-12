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
    description: "The request for fetching positions v2.",
})
export class Positions2V2PaginationPageFilters extends PaginationPageFilters {
    @Field(() => Boolean, {
        nullable: true,
        description: "Whether to sort the positions by createdAt in ascending order.",
    })
        asc?: boolean
}

@InputType({
    description: "The input type for the cursor for fetching positions v2.",
})
export class Positions2V2Request {
    @Field(() => Positions2V2PaginationPageFilters, {
        description: "The filters for pagination.",
    })
        filters: Positions2V2PaginationPageFilters
    @Field(() => ID, {
        description: "The ID of the bot to fetch positions for.",
    })
        botId: string
}

@ObjectType({
    description: "The response for fetching positions v2.",
})
export class Positions2V2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<PositionSchema> {
    @Field(() => [PositionSchema], {
        description: "Positions.",
    })
        data: Array<PositionSchema>
}   

@ObjectType({
    description: "The response for fetching positions v2.",
})
export class Positions2V2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Positions2V2ResponseData> {
    @Field(() => Positions2V2ResponseData, {
        description: "The data for the positions.",
    })
        data: Positions2V2ResponseData
}

