import { InputType, Field, ObjectType, ID } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../../abstracts"

@InputType({
    description: "Input payload for exporting a bot's private key.",
})
export class BackupBotPrivateKeyRequest {
    @Field(() => ID, {
        description: "The ID of the bot to backup the private key for.",
    })
        botId: string
}

@ObjectType({
    description: "Response payload returned after successfully exporting a bot's private key.",
})
export class BackupBotPrivateKeyResponseData {
    @Field(() => String, {
        description: "The private key of the bot",
    })
        privateKey: string
}

@ObjectType({
    description: "Response payload returned after successfully exporting a bot's private key.",
})
export class BackupBotPrivateKeyResponse 
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<BackupBotPrivateKeyResponseData> {
    @Field(() => BackupBotPrivateKeyResponseData, {
        nullable: true,
        description: "The response data from the backupBotPrivateKey mutation",
    })
        data?: BackupBotPrivateKeyResponseData
}

