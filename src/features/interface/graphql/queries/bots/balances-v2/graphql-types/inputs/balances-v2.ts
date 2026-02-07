import {
    Field, ID, InputType,
} from "@nestjs/graphql"

/** Input parameters used to request balances of a bot. */
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
