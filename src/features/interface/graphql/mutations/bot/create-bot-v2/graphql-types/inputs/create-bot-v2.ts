import {
    InputType, Field, ID
} from "@nestjs/graphql"
import {
    GraphQLTypeChainId, ChainId
} from "@modules/common"

@InputType({
    description:
        "Input payload for creating a new bot v2.",
})
export class CreateBotV2Request {
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

    @Field(() => ID,
        {
            description: "The token that the bot aims to accumulate as the primary outcome of its liquidity strategy.",
        })
        targetTokenId: string

    @Field(() => ID,
        {
            description: "The quote token ID",
        })
        quoteTokenId: string

    @Field(() => [ID],
        {
            nullable: true,
            description: "List of liquidity pools where the bot will actively provide and manage liquidity. Must exist in the database.",
        })
        liquidityPoolIds?: Array<string>

    @Field(() => Boolean,
        {
            description: "Whether the bot is exiting to USDC",
            defaultValue: false,
        })
        isExitToUsdc: boolean

    @Field(() => String,
        {
            description: "The withdrawal address of the bot",
            nullable: true,
        })
        withdrawalAddress?: string
}
