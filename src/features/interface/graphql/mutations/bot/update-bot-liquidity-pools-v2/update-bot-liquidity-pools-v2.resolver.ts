import {
    Args, Mutation, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    ThrottlerConfig, UseThrottler 
} from "@modules/throttler"
import {
    GraphQLJwtPrivyAuthGuard 
} from "@modules/privy"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor,
} from "@modules/api"
import { 
    UpdateBotLiquidityPoolsV2Service 
} from "./update-bot-liquidity-pools-v2.service"
import { 
    UpdateBotLiquidityPoolsV2Request, 
    UpdateBotLiquidityPoolsV2Response,
} from "./graphql-types"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    PrivyResponse 
} from "@modules/privy"

@Resolver()
export class UpdateBotLiquidityPoolsV2Resolver {
    constructor(
        private readonly updateBotLiquidityPoolsV2Service: UpdateBotLiquidityPoolsV2Service,
    ) {}

    /**
     * Mutation for refreshing liquidity pools cache (v2).
     * Requires a valid Privy access token for authentication.
     */
    @GraphQLSuccessMessage("Bot's pools updated successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => UpdateBotLiquidityPoolsV2Response,
        {
            description: "Updates the liquidity pools of a bot (v2 with Privy authentication).",
        })
    async updateBotLiquidityPoolsV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args(
            "request", 
            {
                description: "The request payload for updating the liquidity pools of a bot." 
            }
        )
            request: UpdateBotLiquidityPoolsV2Request,
    ) {
        return await this.updateBotLiquidityPoolsV2Service.updateBotLiquidityPoolsV2(request,
            response)
    }
}


