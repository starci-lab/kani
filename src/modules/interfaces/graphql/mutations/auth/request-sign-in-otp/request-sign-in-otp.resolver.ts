import {
    Args, Mutation, Resolver 
} from "@nestjs/graphql"
import {
    RequestSignInOtpService 
} from "./request-sign-in-otp.service"
import {
    UseInterceptors 
} from "@nestjs/common"
import { 
    RequestSignInOtpRequest, 
    RequestSignInOtpResponse,
} from "./request-sign-in-otp.dto"
import {
    ThrottlerConfig 
} from "@modules/throttler"
import {
    UseThrottler 
} from "@modules/throttler/throttler.decorators"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "../../../interceptors"

@Resolver()
export class RequestSignInOtpResolver {
    constructor(
        private readonly requestSignInOtpService: RequestSignInOtpService,
    ) {}

    @GraphQLSuccessMessage("Sign in OTP sent successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @Mutation(() => RequestSignInOtpResponse,
        {
            description: "Request a sign in OTP for authentication.",
        })
    async requestSignInOtp(
        @Args("request") request: RequestSignInOtpRequest,
    ): Promise<void> {
        return this.requestSignInOtpService.requestSignInOtp(request)
    }
}

