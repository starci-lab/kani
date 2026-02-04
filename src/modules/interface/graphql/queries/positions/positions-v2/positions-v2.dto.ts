import {
    Field, ID, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    PositionSchema 
} from "@modules/databases"
import { 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse, 
    IPaginationPageResponseData, 
    PaginationPageResponseData
} from "@modules/api"
import {
    PaginationPageFilters 
} from "@modules/api"

@InputType({
    description: "Options to specify which related entities should be associated with bots v2.",
})
export class PositionsV2AssociateOptions {
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to associate the liquidity pool data with each position.",
        })
        liquidityPool?: boolean
}

@InputType({
    description: "The request for fetching positions v2.",
})
export class PositionsV2PaginationFilters extends PaginationPageFilters {
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to sort the positions by createdAt in ascending order.",
        })
        asc?: boolean
}

@InputType({
    description: "The input type for the cursor for fetching positions v2.",
})
export class PositionsV2Request {
    @Field(() => PositionsV2PaginationFilters,
        {
            description: "The filters for pagination.",
        })
        filters: PositionsV2PaginationFilters
    @Field(() => ID,
        {
            description: "The ID of the bot to fetch positions for.",
        })
        botId: string
    @Field(() => PositionsV2AssociateOptions,
        {
            description: "The options to associate with the positions.",
            nullable: true,
        })
        associate?: PositionsV2AssociateOptions
}

@ObjectType({
    description: "The response for fetching positions v2.",
})
export class PositionsV2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<PositionSchema> {
    @Field(() => [PositionSchema],
        {
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
    @Field(() => PositionsV2ResponseData,
        {
            description: "The data for the positions.",
        })
        data: PositionsV2ResponseData
}

