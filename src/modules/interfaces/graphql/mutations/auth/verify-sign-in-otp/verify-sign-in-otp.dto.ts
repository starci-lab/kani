import { Field, InputType, ObjectType } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../../abstracts"
import { IsEmail, IsJWT, IsString } from "class-validator"

@InputType({
    description: "Request data for verifying a sign in OTP.",
})
export class VerifySignInOtpRequest {
    @IsEmail()
    @Field(() => String, {
        description: "The email of the user verifying a sign in OTP.",
    })
        email: string
    @IsString()
    @Field(() => String, {
        description: "The sign in OTP to verify.",
    })
        otp: string
}

@ObjectType({
    description: "Response data returned after successfully verifying a sign in OTP.",
})
export class VerifySignInOtpResponseData {
    @Field(() => String, {
        description: "The user ID of the authenticated user.",
    })
        id: string
    @IsJWT()
    @Field(() => String, {
        description: "The newly generated short-lived JWT access token used to authenticate API requests.",
    })
        accessToken: string
}

@ObjectType({
    description: "Response returned after successfully verifying a sign in OTP.",
})
export class VerifySignInOtpResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<VerifySignInOtpResponseData> {
    @Field(() => VerifySignInOtpResponseData, {
        nullable: true,
        description: "The data returned after successfully verifying a sign in OTP.",
    })
        data?: VerifySignInOtpResponseData
}

