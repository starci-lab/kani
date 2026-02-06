import {
    Field, ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "@modules/api"

@ObjectType({
    description:
        "Response payload returned after successfully creating a new bot v2.",
})
export class CreateBotV2ResponseData {
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
        "Response payload returned after successfully creating a new bot v2.",
})
export class CreateBotV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<CreateBotV2ResponseData> {
    @Field(() => CreateBotV2ResponseData,
        {
            nullable: true,
            description: "The response data from the createBotV2 mutation",
        })
    data?: CreateBotV2ResponseData
}
