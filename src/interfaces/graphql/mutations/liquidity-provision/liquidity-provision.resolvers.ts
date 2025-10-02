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
    InitializeLiquidityProvisionBotResponse
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
    ) {}

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
}