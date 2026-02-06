import {
    Field, InputType,
} from "@nestjs/graphql"

/** Input fields required to fetch a bot. */
@InputType({
    description: "Input fields required to fetch a bot.",
})
export class BotRequest {
    @Field(() => String,
        {
            description: "The unique ID of the bot.",
        })
    id: string
}
