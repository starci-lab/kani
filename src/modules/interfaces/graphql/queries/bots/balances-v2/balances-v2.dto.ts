import {
    Field, Float, ID, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"

@InputType({
    description: "Input parameters used to request balances of a bot.",
})
export class BalancesV2Request {
    @Field(() => ID,
        {
            description: "Unique identifier of the bot whose balances are being requested.",
        })
        id: string
}

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
@ObjectType({
    description: "The GraphQL response for fetching balances of a bot v2.",
})
export class BalancesV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Array<TokenBalanceV2>> {
    @Field(() => [TokenBalanceV2],
        {
            nullable: true,
            description: "The token balances of the bot.",
        })
        data?: Array<TokenBalanceV2>
}

