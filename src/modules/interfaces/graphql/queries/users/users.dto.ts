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