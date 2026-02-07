import {
    Field, ID, InputType
} from "@nestjs/graphql"

@InputType(
    {
        description: "Input payload for withdrawing a token from a bot.",
    }
)
export class WithdrawV2TokenInput {
    @Field(() => ID,
        {
            description: "The ID of the token to withdraw.",
        })
        id: string

    @Field(() => String,
        {
            description: "The amount of tokens to withdraw.",
        })
        amount: string
}

@InputType({
    description: "Input payload for withdrawing from a bot.",
})
export class WithdrawV2Request {
    @Field(() => ID,
        {
            description: "The ID of the bot to withdraw from.",
        })
        id: string

    @Field(() => [WithdrawV2TokenInput],
        {
            description: "The tokens to withdraw.",
        })
        tokenInputs: Array<WithdrawV2TokenInput>
    @Field(() => Boolean,
        {
            description: "Whether to withdraw to USDC.",
        })
        toUsdc: boolean
}
