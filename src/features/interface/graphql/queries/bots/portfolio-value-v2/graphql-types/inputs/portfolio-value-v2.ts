import {
    Field, ID, InputType,
} from "@nestjs/graphql"

/** Input parameters used to request the portfolio value of a bot. */
@InputType({
    description: "Input parameters used to request the portfolio value of a bot.",
})
export class PortfolioValueV2Request {
    @Field(() => ID,
        {
            description: "The unique identifier of the bot whose portfolio value is being requested.",
        })
    botId: string
}
