import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { ThrottlerConfig, UseThrottler } from "@modules/throttler"
import { GraphQLJwtPrivyAuthGuard } from "@modules/privy"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor,
} from "../../../interceptors"
import { 
    UpdateBotSettingsV2Service 
} from "./update-bot-settings-v2.service"
import { 
    UpdateBotSettingsV2Request, 
    UpdateBotSettingsV2Response,
} from "./update-bot-settings-v2.dto"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import { PrivyResponse } from "@modules/privy"

@Resolver()
export class UpdateBotSettingsV2Resolver {
    constructor(
        private readonly updateBotSettingsV2Service: UpdateBotSettingsV2Service,
    ) {}

    /**
     * Mutation for refreshing liquidity pools cache (v2).
     * Requires a valid Privy access token for authentication.
     */
    @GraphQLSuccessMessage("Bot settings updated successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => UpdateBotSettingsV2Response, {
        description: "Updates the settings of a bot (v2 with Privy authentication).",
    })
    async updateBotSettingsV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args(
            "request", 
            { description: "The request payload for updating the settings of a bot." }
        )
            request: UpdateBotSettingsV2Request,
    ) {
        return await this.updateBotSettingsV2Service.updateBotSettingsV2(request, response)
    }
}


