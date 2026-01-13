import { InputType, Field, ObjectType, ID } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../../abstracts"

@InputType({
    description: "Input payload for exporting a bot's private key v2.",
})
export class BackupBotPrivateKeyV2Request {
    @Field(() => ID, {
        description: "The ID of the bot to backup the private key for.",
    })
        botId: string
}

@ObjectType({
    description: "Response payload returned after successfully exporting a bot's private key v2.",
})
export class BackupBotPrivateKeyV2ResponseData {
    @Field(() => String, {
        description: "The private key of the bot",
    })
        privateKey: string
}

@ObjectType({
    description: "Response payload returned after successfully exporting a bot's private key v2.",
})
export class BackupBotPrivateKeyV2Response 
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BackupBotPrivateKeyV2ResponseData> {
    @Field(() => BackupBotPrivateKeyV2ResponseData, {
        nullable: true,
        description: "The response data from the backupBotPrivateKeyV2 mutation",
    })
        data?: BackupBotPrivateKeyV2ResponseData
}

