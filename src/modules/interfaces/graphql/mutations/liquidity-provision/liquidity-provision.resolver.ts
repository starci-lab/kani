import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { LiquidityProvisionService } from "./liquidity-provision.service"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLUser,
    UserJwtLike,
    GraphQLJwtOnlyVerifiedTOTPAuthGuard,
} from "@modules/passport"
import {
    AddLiquidityProvisionBotRequest,
    AddLiquidityProvisionBotResponse,
    AddLiquidityProvisionBotResponseData,
    InitializeLiquidityProvisionBotRequest,
    InitializeLiquidityProvisionBotResponse,
    StopLiquidityProvisionBotResponse,
    StopLiquidityProvisionBotRequest,
    UpdateLiquidityProvisionBotLiquidityPoolsRequest,
    UpdateLiquidityProvisionBotLiquidityPoolsResponse,
    UpdateLiquidityProvisionBotRpcsResponse,
    UpdateLiquidityProvisionBotRpcsRequest,
    UpdateLiquidityProvisionBotExplorerIdRequest,
    UpdateLiquidityProvisionBotExplorerIdResponse,
    RunLiquidityProvisionBotResponse,
    RunLiquidityProvisionBotRequest,
} from "./liquidity-provision.dto"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler/throttler.decorators"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor
} from "../../interceptors"

@Resolver()
export class LiquidityProvisionResolver {
    constructor(
        private readonly liquidityProvisionService: LiquidityProvisionService,
    ) { }

    /**
     * Mutation for adding a new liquidity provision bot.
     * Requires a valid refresh token for authentication.
     */
    @GraphQLSuccessMessage("Liquidity provision bot added successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => AddLiquidityProvisionBotResponse, {
        description: "Creates and registers a new liquidity provision bot for the authenticated user."
    })
    async addLiquidityProvisionBot(
        @Args("request", { description: "The request payload for creating a new liquidity provision bot." })
            request: AddLiquidityProvisionBotRequest,

        @GraphQLUser() user: UserJwtLike,
    ): Promise<AddLiquidityProvisionBotResponseData> {
        return await this.liquidityProvisionService.addLiquidityProvisionBot(request, user)
    }

    @GraphQLSuccessMessage("Liquidity provision bot initialized successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => InitializeLiquidityProvisionBotResponse, {
        description: "Initializes a liquidity provision bot for the authenticated user."
    })
    async initializeLiquidityProvisionBot(
        @Args("request", { description: "The request payload for initializing a liquidity provision bot." })
            request: InitializeLiquidityProvisionBotRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.liquidityProvisionService.initializeLiquidityProvisionBot(request, user)
    }

    @GraphQLSuccessMessage("Successfully updated liquidity pools for the liquidity provision bot.")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => UpdateLiquidityProvisionBotLiquidityPoolsResponse, {
        description: "Updates the set of liquidity pools managed by a specific liquidity provision bot belonging to the authenticated user.",
    })
    async updateLiquidityProvisionBotLiquidityPools(
        @Args("request", {
            description: "Input payload containing the bot ID and the new list of liquidity pool IDs to manage."
        })
            request: UpdateLiquidityProvisionBotLiquidityPoolsRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.liquidityProvisionService.updateLiquidityProvisionBotLiquidityPools(request, user)
    }

    /**
    * Starts a specific liquidity provision bot for the authenticated user.
    */
    @GraphQLSuccessMessage("Liquidity provision bot started successfully.")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => RunLiquidityProvisionBotResponse, {
        description: "Starts the execution of a liquidity provision bot owned by the authenticated user.",
    })
    async runLiquidityProvisionBot(
        @Args("request", {
            description: "The request payload containing the ID of the bot to start.",
        })
            request: RunLiquidityProvisionBotRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.liquidityProvisionService.runLiquidityProvisionBot(request, user)
    }

    /**
     * Stops a running liquidity provision bot for the authenticated user.
     */
    @GraphQLSuccessMessage("Liquidity provision bot stopped successfully.")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => StopLiquidityProvisionBotResponse, {
        description: "Stops a currently running liquidity provision bot belonging to the authenticated user.",
    })
    async stopLiquidityProvisionBot(
        @Args("request", {
            description: "The request payload containing the ID of the bot to stop.",
        })
            request: StopLiquidityProvisionBotRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.liquidityProvisionService.stopLiquidityProvisionBot(request, user)
    }

    /**
     * Updates RPC endpoints for a specific liquidity provision bot.
     */
    @GraphQLSuccessMessage("Liquidity provision bot RPCs updated successfully.")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => UpdateLiquidityProvisionBotRpcsResponse, {
        description: "Updates the RPC endpoints used by a specific liquidity provision bot.",
    })
    async updateLiquidityProvisionBotRpcs(
        @Args("request", {
            description: "Input payload containing the bot ID and the new RPC URLs to use.",
        })
            request: UpdateLiquidityProvisionBotRpcsRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.liquidityProvisionService.updateLiquidityProvisionBotRpcs(request, user)
    }

    /**
     * Updates the blockchain explorer URL configuration for a liquidity provision bot.
     */
    @GraphQLSuccessMessage("Liquidity provision bot explorer updated successfully.")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @Mutation(() => UpdateLiquidityProvisionBotExplorerIdResponse, {
        description: "Configures or updates the blockchain explorer integration for a liquidity provision bot.",
    })
    async updateLiquidityProvisionBotExplorerId(
        @Args("request", {
            description: "Input payload containing the bot ID and the new explorer base URL.",
        })
            request: UpdateLiquidityProvisionBotExplorerIdRequest,
        @GraphQLUser() user: UserJwtLike,
    ) {
        return await this.liquidityProvisionService.updateLiquidityProvisionBotExplorerId(request, user)
    }
}