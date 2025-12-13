import { ObjectType } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../abstract"
import { UserSchema } from "@modules/databases"
import { Field } from "@nestjs/graphql"

@ObjectType({
    description: "The GraphQL response object returned by the user query.",
})
export class UserResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<UserSchema>
{
    @Field(() => UserSchema, {
        description: "The user data, if the request is successful.",
    })
        data?: UserSchema
}

@ObjectType({
    description: "The GraphQL response object returned by the totp secret query.",
})
export class TotpSecretResponseData {
    @Field(() => String, {
        description: "The encrypted TOTP secret, if the request is successful.",
    })
        totpSecret?: string
    @Field(() => String, {
        description: "The TOTP secret URL, if the request is successful.",
    })
        totpSecretUrl?: string
}

@ObjectType({
    description: "The GraphQL response object returned by the totp secret query.",
})
export class TotpSecretResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<TotpSecretResponseData>
{
    @Field(() => TotpSecretResponseData, {
        description: "The TOTP secret, if the request is successful.",
    })
        data?: TotpSecretResponseData
}