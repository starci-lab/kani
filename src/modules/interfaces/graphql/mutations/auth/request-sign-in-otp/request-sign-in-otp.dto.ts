import { Field, InputType, ObjectType } from "@nestjs/graphql"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../../abstracts"
import { IsEmail } from "class-validator"

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

