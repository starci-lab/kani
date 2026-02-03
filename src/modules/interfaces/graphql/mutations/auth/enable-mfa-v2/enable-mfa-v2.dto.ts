import {
    Field, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"

@InputType({
    description: "Request payload for enabling MFA v2.",
})
export class EnableMFAV2Request {
    @Field(() => String,
        {
            description: "The TOTP code to verify before enabling MFA.",
        })
        totpCode: string
}

@ObjectType({
    description: "Response data returned after successfully enabling MFA v2.",
})
export class EnableMFAV2ResponseData {
    @Field(() => Boolean,
        {
            description: "Whether MFA was successfully enabled.",
        })
        mfaEnabled: boolean
}

@ObjectType({
    description: "Response returned after successfully enabling MFA v2.",
})
export class EnableMFAV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<EnableMFAV2ResponseData> {
    @Field(() => EnableMFAV2ResponseData,
        {
            nullable: true,
            description: "The data returned after successfully enabling MFA v2.",
        })
        data?: EnableMFAV2ResponseData
}
