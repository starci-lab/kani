import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtOnlyMFAEnabledAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor
} from "../../../interceptors"
import { ToggleBotService } from "./toggle-bot.service"
import { 
    ToggleBotRequest,
    ToggleBotResponse,
} from "./toggle-bot.dto"

@Resolver()
export class ToggleBotResolver {
    constructor(
        private readonly toggleBotService: ToggleBotService,
    ) { }

    /**
     * Mutation for toggling the running state of a bot.
     * Requires a valid access token for authentication.
     */
    @GraphQLSuccessMessage("Bot running state toggled successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyMFAEnabledAuthGuard)
    @Mutation(() => ToggleBotResponse, {
        description: "Toggles the running state of a bot for the authenticated user."
    })
    async toggleBot(
        @GraphQLUser() user: UserJwtLike,
        @Args("request", { description: "The request payload for toggling the running state of a bot." })
            request: ToggleBotRequest,
    ) {
        return await this.toggleBotService.toggleBot(user, request)
    }
}

