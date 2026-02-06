import {
    Field, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "@modules/api"
import {
    IsJWT 
} from "class-validator"

@ObjectType({
    description: "Contains the newly issued JWT tokens after a successful refresh operation.",
})
export class RefreshResponseData {
    @IsJWT()
    @Field(() => String,
        {
            description: "The newly generated short-lived JWT access token used to authenticate API requests.",
        })
        accessToken: string
    // non graphql field
    refreshToken?: string
}

@ObjectType({
    description: "Represents the GraphQL response returned when refreshing an expired or soon-to-expire JWT access token.",
})
export class RefreshResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<RefreshResponseData> {
    @Field(() => RefreshResponseData,
        {
            nullable: true,
            description: "The payload containing the new access and refresh tokens.",
        })
        data?: RefreshResponseData
}

