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
    GraphQLJwtPrivyAuthGuard,
    PrivyResponse,
} from "@modules/privy"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor,
} from "@modules/api"
import {
    WithdrawV2Service
} from "./withdraw-v2.service"
import {
    WithdrawV2Request,
    WithdrawV2Response,
} from "./graphql-types"
import {
    VerifyAccessTokenResponse
} from "@privy-io/node"
import {
    GraphQLTOTPGuard 
} from "@modules/totp"

@Resolver()
export class WithdrawV2Resolver {
    constructor(
        private readonly withdrawV2Service: WithdrawV2Service,
    ) {}

    /**
     * Mutation for withdrawing from a bot.
     * Requires a valid Privy access token for authentication.
     */
    @GraphQLSuccessMessage(
        "Withdrawal processed successfully. Your funds will be available in your account shortly."
    )
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(
        GraphQLJwtPrivyAuthGuard,
        GraphQLTOTPGuard
    )
    @Mutation(() => WithdrawV2Response,
        {
            description: "Withdraws funds from a bot (v2 with Privy authentication).",
        })
    async withdrawV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description: "The request payload for withdrawing from a bot.",
            })
            request: WithdrawV2Request,
    ) {
        return await this.withdrawV2Service.withdrawV2(response,
            request)
    }
}
