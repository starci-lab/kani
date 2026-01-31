import {
    Args, Query, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import {
    GraphQLJwtPrivyAuthGuard 
} from "@modules/privy"
import {
    BalancesV2Request,
    BalancesV2Response,
    TokenBalanceV2,
} from "./balances-v2.dto"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "../../../interceptors"
import {
    BalancesV2Service,
} from "./balances-v2.service"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

@Resolver()
export class BalancesV2Resolver {
    constructor(
        private readonly balancesV2Service: BalancesV2Service,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Balances v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => BalancesV2Response,
        {
            description:
            "Returns the token balances of a bot associated with the current user (v2 with Privy authentication).",
        })
    async balancesV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description:
                "Input parameters required to identify which bot should be fetched.",
            })
            request: BalancesV2Request,
    ): Promise<Array<TokenBalanceV2>> {
        return this.balancesV2Service.balancesV2(
            request,
            response
        )
    }
}

