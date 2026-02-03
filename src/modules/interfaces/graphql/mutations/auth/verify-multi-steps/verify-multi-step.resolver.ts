import {
    Args, Mutation, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    ThrottlerConfig, UseThrottler 
} from "@modules/throttler"
import {
    GraphQLJwtPrivyAuthGuard, PrivyResponse 
} from "@modules/privy"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor,
} from "../../../interceptors"
import {
    VerifyMultiStepsService 
} from "./verify-multi-step.service"
import {
    VerifyMultiStepsRequest,
    VerifyMultiStepsResponse,
    VerifyMultiStepsResponseData,
} from "./verify-multi-step.dto"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

@Resolver()
export class VerifyMultiStepsResolver {
    constructor(
        private readonly verifyMultiStepsService: VerifyMultiStepsService,
    ) {}
    
    @GraphQLSuccessMessage("Multi-steps verification completed successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => VerifyMultiStepsResponse,
        {
            description: "Verify multi-steps authentication with TOTP code (v2 with Privy authentication).",
        })
    async verifyMultiSteps(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description: "The request payload for multi-steps verification.",
            })
            request: VerifyMultiStepsRequest,
    ): Promise<VerifyMultiStepsResponseData> {
        return this.verifyMultiStepsService.verifyMultiSteps(response,
            request)
    }
}
