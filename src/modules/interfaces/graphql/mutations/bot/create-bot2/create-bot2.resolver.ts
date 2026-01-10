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
import { CreateBot2Service } from "./create-bot2.service"
import { 
    CreateBot2Request, 
    CreateBot2ResponseData, 
    CreateBot2Response, 
} from "./create-bot2.dto"

@Resolver()
export class CreateBot2Resolver {
    constructor(
        private readonly createBot2Service: CreateBot2Service,
    ) { }

    /**
     * Mutation for creating a new bot 2.
     * Requires a valid refresh token for authentication.
     */
    @GraphQLSuccessMessage("Bot 2 created successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Mutation(() => CreateBot2Response, {
        description: "Creates a new bot 2 for the authenticated user."
    })
    async createBot2(
        @GraphQLUser() user: UserJwtLike,
        @Args("request", { description: "The request payload for creating a new bot 2." })
            request: CreateBot2Request,
    ): Promise<CreateBot2ResponseData> {
        return await this.createBot2Service.createBot2(user, request)
    }
}

