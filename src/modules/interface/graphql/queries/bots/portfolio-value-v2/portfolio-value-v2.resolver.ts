import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import { GraphQLJwtPrivyAuthGuard } from "@modules/privy"
import {
    PortfolioValueV2Request,
    PortfolioValueV2Response,
    PortfolioValueV2ResponseData,
} from "./portfolio-value-v2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "@modules/api"
import { PortfolioValueV2Service } from "./portfolio-value-v2.service"
import { VerifyAccessTokenResponse } from "@privy-io/node"

@Resolver()
export class PortfolioValueV2Resolver {
    constructor(
        private readonly portfolioValueV2Service: PortfolioValueV2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Portfolio value v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => PortfolioValueV2Response, {
        description:
            "Returns the portfolio value associated with a bot (v2 with Privy authentication).",
    })
    async portfolioValueV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request", {
            description:
                "Input parameters required to identify which bot's portfolio value should be fetched.",
        })
            request: PortfolioValueV2Request,
    ): Promise<PortfolioValueV2ResponseData> {
        return this.portfolioValueV2Service.portfolioValueV2(request, response)
    }
}


