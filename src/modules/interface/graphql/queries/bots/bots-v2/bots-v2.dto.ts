import {
    Field, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    BotSchema 
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
    description: "The request for fetching bots v2.",
})
export class BotsV2PaginationFilters extends PaginationPageFilters {
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to sort the bots by timestamp in ascending order.",
        })
        asc?: boolean

    @Field(() => String,
        {
            nullable: true,
            description: "The search string to filter the bots by.",
        })
        searchString?: string
}

@InputType({
    description: "Options to specify which related entities should be associated with bots v2 active positions.",
})
export class BotsV2ActivePositionAssociateOptions {
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to associate the liquidity pool data with each active position.",
        })
        liquidityPool?: boolean
  
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to associate the position data with each active position.",
        })
        position?: boolean
}

@InputType({
    description: "Options to specify which related entities should be associated with bots v2.",
})
export class BotsV2AssociateOptions {
    @Field(() => BotsV2ActivePositionAssociateOptions,
        {
            nullable: true,
            description: "Options to associate related entities with each active position.",
        })
        activePosition?: BotsV2ActivePositionAssociateOptions

    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to associate the status of the bots.",
        })
        status?: boolean
}

@InputType({
    description: "The input type for fetching bots v2.",
})
export class BotsV2Request {
    @Field(() => BotsV2PaginationFilters,
        {
            nullable: true,
            description: "The filters for pagination.",
        })
        filters?: BotsV2PaginationFilters

    @Field(() => BotsV2AssociateOptions,
        {
            description: "The options to associate with the bots.",
            nullable: true,
        })
        associate?: BotsV2AssociateOptions
}

@ObjectType({
    description: "The response for fetching bots v2.",
})
export class BotsV2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<BotSchema> {
    @Field(() => [BotSchema],
        {
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
    @Field(() => BotsV2ResponseData,
        {
            description: "The data for the bots.",
            nullable: true,
        })
        data?: BotsV2ResponseData
}

