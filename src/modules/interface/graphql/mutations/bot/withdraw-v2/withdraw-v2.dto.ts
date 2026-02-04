import {
    Field, ID, InputType, ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "@modules/api"

@InputType(
    {
        description: "Input payload for withdrawing a token from a bot.",
    }
)
export class WithdrawV2Token {
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

    @Field(() => [WithdrawV2Token],
        {
            description: "The tokens to withdraw.",
        })
        tokens: Array<WithdrawV2Token>
}

@ObjectType(
    {
        description: "Standard GraphQL response returned after withdrawing from a bot.",
    }
)
export class WithdrawV2ResponseData {
    @Field(
        () => String,
        {
            description: "The job ID of the withdrawal.",
        }
    )
        jobId: string
}

@ObjectType(
    {
        description: "Standard GraphQL response returned after withdrawing from a bot (v2).",
    }
)
export class WithdrawV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<WithdrawV2ResponseData> {
        @Field(() => WithdrawV2ResponseData,
            {
                description: "The response data of the withdrawal.",
            }
        )
            data: WithdrawV2ResponseData
}
