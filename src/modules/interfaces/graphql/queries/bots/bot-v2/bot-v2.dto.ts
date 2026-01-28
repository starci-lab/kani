import {
    Field, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"
import {
    BotSchema 
} from "@modules/databases"

@InputType({
    description: "Options to specify which related entities should be associated with bot v2.",
})
export class BotV2ActivePositionAssociateOptions {
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
export class BotV2AssociateOptions {
    @Field(() => BotV2ActivePositionAssociateOptions,
        {
            nullable: true,
            description: "Options to associate related entities with each active position.",
        })
        activePosition?: BotV2ActivePositionAssociateOptions
}


@InputType({
    description: "Input fields required to fetch a bot v2.",
})
export class BotV2Request {
    @Field(() => String,
        {
            description: "The unique ID of the bot.",
        })
        id: string

    @Field(() => BotV2AssociateOptions,
        {
            nullable: true,
            description: "Options to associate related entities with the bot.",
        })
        associate?: BotV2AssociateOptions
}

@ObjectType({
    description: "The GraphQL response for fetching details of a bot v2.",
})
export class BotV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BotSchema> {
    @Field(() => BotSchema,
        {
            nullable: true,
            description: "The bot data, if the request is successful.",
        })
        data?: BotSchema
}

