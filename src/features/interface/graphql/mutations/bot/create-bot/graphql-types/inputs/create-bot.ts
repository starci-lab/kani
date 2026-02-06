import {
    GraphQLTypeTokenId, TokenId, GraphQLTypeLiquidityPoolId, LiquidityPoolId
} from "@modules/databases"
import {
    InputType, Field,
} from "@nestjs/graphql"
import {
    GraphQLTypeChainId, ChainId
} from "@modules/common"

@InputType({
    description:
        "Input payload for creating a new bot.",
})
export class CreateBotRequest {
    @Field(() => String,
        {
            description: "The new name of the bot.",
        })
        name: string

    @Field(() => GraphQLTypeChainId,
        {
            description: "The blockchain network where the bot will operate",
        })
        chainId: ChainId

    @Field(() => GraphQLTypeTokenId,
        {
            description: "The token that the bot aims to accumulate as the primary outcome of its liquidity strategy.",
        })
        targetTokenId: TokenId

    @Field(() => GraphQLTypeTokenId,
        {
            description: "The quote token ID",
        })
        quoteTokenId: TokenId

    @Field(() => [GraphQLTypeLiquidityPoolId],
        {
            nullable: true,
            description: "List of liquidity pools where the bot will actively provide and manage liquidity. Must exist in the database.",
        })
        liquidityPoolIds?: Array<LiquidityPoolId>

    @Field(() => Boolean,
        {
            description: "Whether the bot is exiting to USDC",
            defaultValue: false,
        })
        isExitToUsdc: boolean
}
