import { ObjectType } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../../abstracts"
import { UserSchema } from "@modules/databases"
import { Field } from "@nestjs/graphql"

@ObjectType({
    description: "The GraphQL response object returned by the user v2 query.",
})
export class UserV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<UserSchema>
{
    @Field(() => UserSchema, {
        description: "The user data, if the request is successful.",
    })
        data?: UserSchema
}

