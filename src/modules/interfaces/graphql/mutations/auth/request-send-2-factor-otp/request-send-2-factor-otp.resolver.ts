import { Mutation, Resolver } from "@nestjs/graphql"
import { RequestSend2FactorOtpService } from "./request-send-2-factor-otp.service"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { 
    GraphQLUser, 
    UserJwtLike, 
    GraphQLJwtOnlyMFAEnabledAuthGuard
} from "@modules/passport"
import { 
    RequestSend2FactorOtpResponse,
} from "./request-send-2-factor-otp.dto"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler/throttler.decorators"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"

@Resolver()
export class RequestSend2FactorOtpResolver {
    constructor(
        private readonly requestSend2FactorOtpService: RequestSend2FactorOtpService,
    ) {}

    @GraphQLSuccessMessage("Send OTP sent successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyMFAEnabledAuthGuard)
    @Mutation(() => RequestSend2FactorOtpResponse, {
        description: "Request a send OTP for 2-factor authentication.",
    })
    async requestSend2FactorOtp(
        @GraphQLUser() user: UserJwtLike,
    ): Promise<void> {
        return this.requestSend2FactorOtpService.requestSend2FactorOtp(user)
    }
}

