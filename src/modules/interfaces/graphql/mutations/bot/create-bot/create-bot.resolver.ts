import {
    Args, Mutation, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    GraphQLJwtAccessTokenAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
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
    CreateBotService 
} from "./create-bot.service"
import { 
    CreateBotRequest, 
    CreateBotResponseData, 
    CreateBotResponse, 
} from "./create-bot.dto"

@Resolver()
export class CreateBotResolver {
    constructor(
        private readonly createBotService: CreateBotService,
    ) { }

    /**
     * Mutation for creating a new bot.
     * Requires a valid refresh token for authentication.
     */
    @GraphQLSuccessMessage("Bot created successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Mutation(() => CreateBotResponse,
        {
            description: "Creates a new bot for the authenticated user."
        })
    async createBot(
        @GraphQLUser() user: UserJwtLike,
        @Args("request",
            {
                description: "The request payload for creating a new bot." 
            })
            request: CreateBotRequest,
    ): Promise<CreateBotResponseData> {
        return await this.createBotService.createBot(user,
            request)
    }
}

