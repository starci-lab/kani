import {
    Field, ID, InputType
} from "@nestjs/graphql"

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
