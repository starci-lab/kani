import {
    InputType, Field,
} from "@nestjs/graphql"

@InputType({
    description: "Input payload used to start or stop a bot v2.",
})
export class ToggleBotV2Request {
    @Field(() => String,
        {
            description: "Unique identifier of the bot whose running state will be changed.",
        })
        id: string

    @Field(() => Boolean,
        {
            description: "Desired running state of the bot. `true` to start, `false` to stop.",
        })
        running: boolean
}
