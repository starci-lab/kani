import {
    Field, InputType,
} from "@nestjs/graphql"
import {
    IsEmail, IsString,
} from "class-validator"

/** Request data for verifying a sign in OTP. */
@InputType({
    description: "Request data for verifying a sign in OTP.",
})
export class VerifySignInOtpRequest {
    @IsEmail()
    @Field(() => String,
        {
            description: "The email of the user verifying a sign in OTP.",
        })
    email: string
    @IsString()
    @Field(() => String,
        {
            description: "The sign in OTP to verify.",
        })
    otp: string
}
