import {
    Field, ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "@modules/api"

@ObjectType({
    description:
        "Response payload returned after successfully creating a new bot.",
})
export class CreateBotResponseData {
    @Field(() => String,
        {
            description: "The ID of the bot",
        })
    id: string

    @Field(() => String,
        {
            description: "The account address of the wallet",
        })
    accountAddress: string
}

@ObjectType({
    description:
        "Response payload returned after successfully creating a new bot.",
})
export class CreateBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<CreateBotResponseData> {
    @Field(() => CreateBotResponseData,
        {
            nullable: true,
            description: "The response data from the createBot mutation",
        })
    data?: CreateBotResponseData
}
