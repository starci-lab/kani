import { Field, ObjectType } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../abstract"

@ObjectType({
    description: "Response data returned after successfully verifying a Privy access token.",
})
export class VerifyPrivyAuthTokenResponseData {
    @Field(() => String, {
        description: "The user ID of the authenticated user.",
    })
        userId: string
}

@ObjectType({
    description: "Response returned after successfully verifying a Privy access token.",
})
export class VerifyPrivyAuthTokenResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<VerifyPrivyAuthTokenResponseData> {
    @Field(() => VerifyPrivyAuthTokenResponseData, {
        nullable: true,
        description: "The data returned after successfully verifying a Privy access token.",
    })
        data: VerifyPrivyAuthTokenResponseData
}