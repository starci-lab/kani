import {
    Field, InputType,
} from "@nestjs/graphql"
import {
    PaginationPageFilters,
} from "@modules/api"

/** The request for fetching bots v2. */
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

/** Options to specify which related entities should be associated with bots v2 active positions. */
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

/** Options to specify which related entities should be associated with bots v2. */
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

/** The input type for fetching bots v2. */
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
