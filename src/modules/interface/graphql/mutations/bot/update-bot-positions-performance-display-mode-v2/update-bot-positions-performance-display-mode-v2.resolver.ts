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
} from "@modules/api"
import {
    UpdateBotPositionsPerformanceDisplayModeV2Service 
} from "./update-bot-positions-performance-display-mode-v2.service"
import { 
    UpdateBotPositionsPerformanceDisplayModeV2Request,
    UpdateBotPositionsPerformanceDisplayModeV2Response,
} from "./update-bot-positions-performance-display-mode-v2.dto"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    GraphQLJwtPrivyAuthGuard, PrivyResponse 
} from "@modules/privy"

@Resolver()
export class UpdateBotPositionsPerformanceDisplayModeV2Resolver {
    constructor(
        private readonly updateBotPositionsPerformanceDisplayModeV2Service: UpdateBotPositionsPerformanceDisplayModeV2Service,
    ) { }

    /**
     * Mutation for updating the positions performance display mode of a bot v2.
     * Requires a valid Privy access token for authentication.
     */
    @GraphQLSuccessMessage("Bot positions performance display mode updated successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => UpdateBotPositionsPerformanceDisplayModeV2Response,
        {
            description: "Updates the positions performance display mode of a bot for the authenticated user (v2 with Privy authentication)."
        })
    async updateBotPositionsPerformanceDisplayModeV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description: "The request payload for updating the positions performance display mode of a bot." 
            })
            request: UpdateBotPositionsPerformanceDisplayModeV2Request,
    ) {
        return await this.updateBotPositionsPerformanceDisplayModeV2Service.updateBotPositionsPerformanceDisplayModeV2(response,
            request)
    }
}
