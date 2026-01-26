import {
    Field, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"

@ObjectType({
    description: "Response data returned after successfully enabling MFA.",
})
export class EnableMFAResponseData {
    @Field(() => String,
        {
            description: "A short-lived JWT access token issued upon successful MFA enablement.",
        })
        accessToken: string
}

@ObjectType({
    description: "Response returned after successfully enabling MFA.",
})
export class EnableMFAResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<EnableMFAResponseData> {
    @Field(() => EnableMFAResponseData,
        {
            nullable: true,
            description: "The data returned after successfully enabling MFA.",
        })
        data?: EnableMFAResponseData
}

