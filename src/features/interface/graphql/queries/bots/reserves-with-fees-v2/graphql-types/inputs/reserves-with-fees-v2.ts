import {
    Field, ID, InputType,
} from "@nestjs/graphql"

/** Input parameters used to request reserves and fees for a bot position (v2). */
@InputType({
    description: "Input parameters used to request reserves and fees for a bot position (v2).",
})
export class ReservesWithFeesV2Request {
    @Field(() => ID,
        {
            description: "Unique identifier of the bot whose reserves and fees are being queried.",
        })
        botId: string
}
