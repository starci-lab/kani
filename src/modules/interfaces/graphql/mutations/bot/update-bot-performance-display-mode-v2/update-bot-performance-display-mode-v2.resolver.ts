import {
    Args, Mutation, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    ThrottlerConfig 
} from "@modules/throttler"
import {
    UseThrottler 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor
} from "../../../interceptors"
import {
    UpdateBotPerformanceDisplayModeV2Service 
} from "./update-bot-performance-display-mode-v2.service"
import { 
    UpdateBotPerformanceDisplayModeV2Request,
    UpdateBotPerformanceDisplayModeV2Response,
} from "./update-bot-performance-display-mode-v2.dto"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    GraphQLJwtPrivyAuthGuard, PrivyResponse 
} from "@modules/privy"

@Resolver()
export class UpdateBotPerformanceDisplayModeV2Resolver {
    constructor(
        private readonly updateBotPerformanceDisplayModeV2Service: UpdateBotPerformanceDisplayModeV2Service,
    ) { }

    /**
     * Mutation for updating the performance display mode of a bot v2.
     * Requires a valid Privy access token for authentication.
     */
    @GraphQLSuccessMessage("Bot performance display mode updated successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => UpdateBotPerformanceDisplayModeV2Response,
        {
            description: "Updates the performance display mode of a bot for the authenticated user (v2 with Privy authentication)."
        })
    async updateBotPerformanceDisplayModeV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description: "The request payload for updating the performance display mode of a bot." 
            })
            request: UpdateBotPerformanceDisplayModeV2Request,
    ) {
        return await this.updateBotPerformanceDisplayModeV2Service.updateBotPerformanceDisplayModeV2(response,
            request)
    }
}
