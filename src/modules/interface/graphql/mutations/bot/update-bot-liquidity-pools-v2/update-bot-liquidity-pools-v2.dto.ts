import {
    Field, ID, ObjectType, InputType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "@modules/api"

@InputType({
    description: "Input payload for updating bot liquidity pools (v2).",
})
export class UpdateBotLiquidityPoolsV2Request {
    @Field(() => ID,
        {
            description: "The ID of the bot whose liquidity pools will be updated.",
        })
        id: string   
    @Field(() => [ID],
        {
            description: "The display ids of the liquidity pools to update.",
        })
        liquidityPoolIds: Array<string>
}


@ObjectType({
    description: "Standard GraphQL response returned after updating bot liquidity pools (v2).",
})
export class UpdateBotLiquidityPoolsV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}


