import {
    Field, ID, InputType
} from "@nestjs/graphql"

@InputType({
    description: "Input payload for updating bot settings (v2).",
})
export class UpdateBotSettingsV2Request {
    @Field(() => ID,
        {
            description: "The ID of the bot whose settings will be updated.",
        })
        id: string
    @Field(() => String,
        {
            description: "The new name of the bot.",
            nullable: true,
        })
        name?: string
    @Field(() => Boolean,
        {
            description: "Whether the bot is exiting to USDC",
            nullable: true,
        })
        isExitToUsdc?: boolean
    @Field(() => String,
        {
            description: "The withdrawal address of the bot",
            nullable: true,
        })
        withdrawalAddress?: string
}
