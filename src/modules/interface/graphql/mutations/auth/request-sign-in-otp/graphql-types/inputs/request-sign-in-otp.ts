import {
    Field, InputType,
} from "@nestjs/graphql"
import {
    IsEmail,
} from "class-validator"

/** Request data for requesting a sign in OTP. */
@InputType({
    description: "Request data for requesting a sign in OTP.",
})
export class RequestSignInOtpRequest {
    @IsEmail()
    @Field(() => String,
        {
            description: "The email of the user requesting a sign in OTP.",
        })
    email: string
}
