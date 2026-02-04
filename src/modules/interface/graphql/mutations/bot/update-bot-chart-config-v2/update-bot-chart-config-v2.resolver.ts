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
    GraphQLJwtPrivyAuthGuard,
    PrivyResponse,
} from "@modules/privy"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor,
} from "@modules/api"
import {
    UpdateBotChartConfigV2Service
} from "./update-bot-chart-config-v2.service"
import {
    UpdateBotChartConfigV2Request,
    UpdateBotChartConfigV2Response,
} from "./update-bot-chart-config-v2.dto"
import {
    VerifyAccessTokenResponse
} from "@privy-io/node"

@Resolver()
export class UpdateBotChartConfigV2Resolver {
    constructor(
        private readonly updateBotChartConfigV2Service: UpdateBotChartConfigV2Service,
    ) {}

    /**
     * Mutation for updating the chart config of a bot v2.
     * Requires a valid Privy access token for authentication.
     */
    @GraphQLSuccessMessage("Bot chart config updated successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => UpdateBotChartConfigV2Response,
        {
            description: "Updates the chart config (unit and interval) of a bot (v2 with Privy authentication).",
        })
    async updateBotChartConfigV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description: "The request payload for updating the chart config of a bot.",
            })
            request: UpdateBotChartConfigV2Request,
    ) {
        return await this.updateBotChartConfigV2Service.updateBotChartConfigV2(response, request)
    }
}
