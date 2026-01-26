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
    ToggleBotV2Service 
} from "./toggle-bot-v2.service"
import { 
    ToggleBotV2Request,
    ToggleBotV2Response,
} from "./toggle-bot-v2.dto"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    GraphQLJwtPrivyAuthGuard, PrivyResponse 
} from "@modules/privy"

@Resolver()
export class ToggleBotV2Resolver {
    constructor(
        private readonly toggleBotV2Service: ToggleBotV2Service,
    ) { }

    /**
     * Mutation for toggling the running state of a bot v2.
     * Requires a valid Privy access token for authentication.
     */
    @GraphQLSuccessMessage("Bot running state toggled successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => ToggleBotV2Response,
        {
            description: "Toggles the running state of a bot for the authenticated user (v2 with Privy authentication)."
        })
    async toggleBotV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description: "The request payload for toggling the running state of a bot." 
            })
            request: ToggleBotV2Request,
    ) {
        return await this.toggleBotV2Service.toggleBotV2(response,
            request)
    }
}

