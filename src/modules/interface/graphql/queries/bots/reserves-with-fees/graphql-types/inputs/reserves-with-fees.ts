import {
    Field, ID, InputType,
} from "@nestjs/graphql"

/** Input parameters used to request reserves and fees for a bot position. */
@InputType({
    description: "Input parameters used to request reserves and fees for a bot position.",
})
export class ReservesWithFeesRequest {
    @Field(() => ID,
        {
            description: "Unique identifier of the bot whose reserves and fees are being queried.",
        })
        botId: string
}
