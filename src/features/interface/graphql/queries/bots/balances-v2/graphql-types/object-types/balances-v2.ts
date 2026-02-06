import {
    Field, Float, ObjectType,
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse,
} from "@modules/api"

/** The GraphQL response for fetching balances of a bot v2. */
@ObjectType({
    description: "The GraphQL response for fetching balances of a bot v2.",
})
export class TokenBalanceV2 {
    @Field(() => String,
        {
            description: "The ID of the token.",
        })
    id: string

    @Field(() => String,
        {
            description: "The balance amount of the token.",
        })
    balanceAmount: string

    @Field(() => Float,
        {
            description: "The balance amount of the token in decimal format.",
        })
    balanceAmountDecimal: number
}

/** The GraphQL response for fetching balances of a bot v2. */
@ObjectType({
    description: "The GraphQL response for fetching balances of a bot v2.",
})
export class BalancesV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Array<TokenBalanceV2>>
{
    @Field(() => [TokenBalanceV2],
        {
            nullable: true,
            description: "The token balances of the bot.",
        })
    data?: Array<TokenBalanceV2>
}
