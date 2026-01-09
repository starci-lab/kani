import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtAccessTokenAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor
} from "../../../interceptors"
import { CreateBotV2Service } from "./create-bot-v2.service"
import { 
    CreateBotV2Request, 
    CreateBotV2ResponseData, 
    CreateBotV2Response, 
} from "./create-bot-v2.dto"

@Resolver()
export class CreateBotV2Resolver {
    constructor(
        private readonly createBotV2Service: CreateBotV2Service,
    ) { }

    /**
     * Mutation for creating a new bot v2.
     * Requires a valid refresh token for authentication.
     */
    @GraphQLSuccessMessage("Bot v2 created successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Mutation(() => CreateBotV2Response, {
        description: "Creates a new bot v2 for the authenticated user."
    })
    async createBotV2(
        @GraphQLUser() user: UserJwtLike,
        @Args("request", { description: "The request payload for creating a new bot v2." })
            request: CreateBotV2Request,
    ): Promise<CreateBotV2ResponseData> {
        return await this.createBotV2Service.createBotV2(user, request)
    }
}

