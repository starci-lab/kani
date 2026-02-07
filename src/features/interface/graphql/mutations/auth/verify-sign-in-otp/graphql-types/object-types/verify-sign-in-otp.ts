import {
    Field, ObjectType,
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse,
} from "@modules/api"
import {
    IsJWT,
} from "class-validator"

/** Response data returned after successfully verifying a sign in OTP. */
@ObjectType({
    description: "Response data returned after successfully verifying a sign in OTP.",
})
export class VerifySignInOtpResponseData {
    @Field(() => String,
        {
            description: "The user ID of the authenticated user.",
        })
        id: string
    @IsJWT()
    @Field(() => String,
        {
            description: "The newly generated short-lived JWT access token used to authenticate API requests.",
        })
        accessToken: string
}

/** Response returned after successfully verifying a sign in OTP. */
@ObjectType({
    description: "Response returned after successfully verifying a sign in OTP.",
})
export class VerifySignInOtpResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<VerifySignInOtpResponseData>
{
    @Field(() => VerifySignInOtpResponseData,
        {
            nullable: true,
            description: "The data returned after successfully verifying a sign in OTP.",
        })
        data?: VerifySignInOtpResponseData
}
