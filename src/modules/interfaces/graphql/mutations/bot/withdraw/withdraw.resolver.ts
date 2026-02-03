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
} from "../../../interceptors"
import {
    WithdrawService
} from "./withdraw.service"
import {
    WithdrawRequest,
    WithdrawResponse,
} from "./withdraw.dto"
import {
    VerifyAccessTokenResponse
} from "@privy-io/node"

@Resolver()
export class WithdrawResolver {
    constructor(
        private readonly withdrawService: WithdrawService,
    ) {}

    /**
     * Mutation for withdrawing from a bot.
     * Requires a valid Privy access token for authentication.
     */
    @GraphQLSuccessMessage("Withdrawal processed successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => WithdrawResponse,
        {
            description: "Withdraws funds from a bot (v2 with Privy authentication).",
        })
    async withdraw(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description: "The request payload for withdrawing from a bot.",
            })
            request: WithdrawRequest,
    ) {
        return await this.withdrawService.withdraw(response, request)
    }
}
