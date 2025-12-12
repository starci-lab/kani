import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLPrivyAuthGuard,
    PrivyResponse,
} from "@modules/passport"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor
} from "../../interceptors"
import { BotV2Service } from "./bot-v2.service"
import { 
    CreateBotRequest, 
    CreateBotResponseData, 
    CreateBotResponse 
} from "./bot-v2.dto"
import { VerifyAuthTokenResponse } from "@privy-io/node"

@Resolver()
export class BotV2Resolver {
    constructor(
        private readonly botV2Service: BotV2Service,
    ) { }

    /**
     * Mutation for creating a new bot.
     * Requires a valid refresh token for authentication.
     */
    @GraphQLSuccessMessage("Bot created successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLPrivyAuthGuard)
    @Mutation(() => CreateBotResponse, {
        description: "Creates a new bot for the authenticated user."
    })
    async createBot(
        @PrivyResponse() response: VerifyAuthTokenResponse,
        @Args("request", { description: "The request payload for creating a new bot." })
            request: CreateBotRequest,
    ): Promise<CreateBotResponseData> {
        return await this.botV2Service.createBot(response, request)
    }
}