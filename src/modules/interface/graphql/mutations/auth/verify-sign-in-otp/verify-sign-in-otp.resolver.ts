import { Args, Context, Mutation, Resolver } from "@nestjs/graphql"
import { VerifySignInOtpService } from "./verify-sign-in-otp.service"
import { UseInterceptors } from "@nestjs/common"
import { 
    VerifySignInOtpRequest,
    VerifySignInOtpResponse,
    VerifySignInOtpResponseData,
} from "./verify-sign-in-otp.dto"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler/throttler.decorators"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "@modules/api"
import { Response } from "express"

@Resolver()
export class VerifySignInOtpResolver {
    constructor(
        private readonly verifySignInOtpService: VerifySignInOtpService,
    ) {}

    @GraphQLSuccessMessage("Sign in OTP verified successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @Mutation(() => VerifySignInOtpResponse, {
        description: "Verify a sign in OTP for authentication.",
    })
    async verifySignInOtp(
        @Args("request") request: VerifySignInOtpRequest,
        @Context("res") res: Response,
    ): Promise<VerifySignInOtpResponseData> {
        return this.verifySignInOtpService.verifySignInOtp(request, res)
    }
}

