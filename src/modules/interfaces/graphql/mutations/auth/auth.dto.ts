import { Field, InputType, ObjectType } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../abstract"
import { IsEmail, IsJWT, IsString } from "class-validator"

@ObjectType({
    description: "Response data returned after successfully confirming a TOTP code.",
})
export class ConfirmTotpResponseData {
    @Field(() => String, {
        description: "A short-lived JWT access token issued upon successful TOTP verification.",
    })
        accessToken: string
    // non graphql field
    refreshToken?: string
}

@ObjectType({
    description: "Response returned after successfully confirming a TOTP code.",
})
export class ConfirmTotpResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<ConfirmTotpResponseData> {
    @Field(() => ConfirmTotpResponseData, {
        nullable: true,
        description: "The data returned after successfully confirming a TOTP code.",
    })
        data: ConfirmTotpResponseData
}

@ObjectType({
    description: "Contains the newly issued JWT tokens after a successful refresh operation.",
})
export class RefreshResponseData {
    @IsJWT()
    @Field(() => String, {
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
    @Field(() => RefreshResponseData, {
        description: "The payload containing the new access and refresh tokens.",
    })
        data: RefreshResponseData
}

@InputType({
    description: "Request data for requesting a sign in OTP.",
})
export class RequestSignInOtpRequest {
    @IsEmail()
    @Field(() => String, {
        description: "The email of the user requesting a sign in OTP.",
    })
        email: string
}
@ObjectType({
    description: "Response returned after successfully requesting a sign in OTP.",
})
export class RequestSignInOtpResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}

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
        data: VerifySignInOtpResponseData
}