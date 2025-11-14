import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { BotService } from "./bot.service"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLUser,
    UserJwtLike,
    GraphQLJwtOnlyVerifiedTOTPAuthGuard,
} from "@modules/passport"
import {
    AddBotResponse,
    InitializeBotResponse,
    AddBotRequest,
    UpdateBotLiquidityPoolsRequest,
    UpdateBotLiquidityPoolsResponse,
    InitializeBotRequest,
    RunBotResponse,
    RunBotRequest,
    StopBotResponse,
    StopBotRequest,
    UpdateBotRpcsResponse,
    UpdateBotRpcsRequest,
    UpdateBotExplorerIdResponse,
    UpdateBotExplorerIdRequest,
    AddBotResponseData,
} from "./bot.dto"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler/throttler.decorators"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor
} from "../../interceptors"

@Resolver()
export class BotResolver {
    constructor(
        private readonly botService: BotService,
    ) { }

    /**
     * Mutation for adding a new bot.
     * Requires a valid refresh token for authentication.
     */
    @GraphQLSuccessMessage("Bot added successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => AddBotResponse, {
        description: "Creates and registers a new bot for the authenticated user."
    })
    async addBot(
        @Args("request", { description: "The request payload for creating a new bot." })
            request: AddBotRequest,

        @GraphQLUser() user: UserJwtLike,
    ): Promise<AddBotResponseData> {
        return await this.botService.addBot(request, user)
    }
    
    @GraphQLSuccessMessage("Bot initialized successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => InitializeBotResponse, {
        description: "Initializes a bot for the authenticated user."
    })
    async initializeBot(
        @Args("request", { description: "The request payload for initializing a bot." })
            request: InitializeBotRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.botService.initializeBot(request, user)
    }

    @GraphQLSuccessMessage("Successfully updated liquidity pools for the bot.")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => UpdateBotLiquidityPoolsResponse, {
        description: "Updates the set of liquidity pools managed by a specific liquidity provision bot belonging to the authenticated user.",
    })
    async updateBotLiquidityPools(
        @Args("request", {
            description: "Input payload containing the bot ID and the new list of liquidity pool IDs to manage."
        })
            request: UpdateBotLiquidityPoolsRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.botService.updateBotLiquidityPools(request, user)
    }

    /**
    * Starts a specific liquidity provision bot for the authenticated user.
    */
    @GraphQLSuccessMessage("Liquidity provision bot started successfully.")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => RunBotResponse, {
        description: "Starts the execution of a liquidity provision bot owned by the authenticated user.",
    })
    async runBot(
        @Args("request", {
            description: "The request payload containing the ID of the bot to start.",
        })
            request: RunBotRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.botService.runBot(request, user)
    }

    /**
     * Stops a running liquidity provision bot for the authenticated user.
     */
    @GraphQLSuccessMessage("Liquidity provision bot stopped successfully.")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => StopBotResponse, {
        description: "Stops a currently running liquidity provision bot belonging to the authenticated user.",
    })
    async stopBot(
        @Args("request", {
            description: "The request payload containing the ID of the bot to stop.",
        })
            request: StopBotRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.botService.stopBot(request, user)
    }

    /**
     * Updates RPC endpoints for a specific liquidity provision bot.
     */
    @GraphQLSuccessMessage("Liquidity provision bot RPCs updated successfully.")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => UpdateBotRpcsResponse, {
        description: "Updates the RPC endpoints used by a specific liquidity provision bot.",
    })
    async updateBotRpcs(
        @Args("request", {
            description: "Input payload containing the bot ID and the new RPC URLs to use.",
        })
            request: UpdateBotRpcsRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.botService.updateBotRpcs(request, user)
    }

    /**
     * Updates the blockchain explorer URL configuration for a liquidity provision bot.
     */
    @GraphQLSuccessMessage("Liquidity provision bot explorer updated successfully.")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => UpdateBotExplorerIdResponse, {
        description: "Configures or updates the blockchain explorer integration for a liquidity provision bot.",
    })
    async updateBotExplorerId(
        @Args("request", {
            description: "Input payload containing the bot ID and the new explorer base URL.",
        })
            request: UpdateBotExplorerIdRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.botService.updateBotExplorerId(request, user)
    }
}