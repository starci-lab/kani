import { Args, Query, Resolver } from "@nestjs/graphql"
import { LiquidityPools2Service } from "./liquidity-pools2.service"
import { GraphQLSuccessMessage } from "../../../interceptors"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { LiquidityPools2Request, LiquidityPools2Response, LiquidityPools2ResponseData } from "./liquidity-pools2.dto"    
import { GraphQLTransformInterceptor } from "../../../interceptors"
import { UseInterceptors } from "@nestjs/common"

@Resolver()
export class LiquidityPools2Resolver {
    constructor(
        private readonly liquidityPools2Service: LiquidityPools2Service,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Liquidity pools2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => LiquidityPools2Response, {
        description: "Fetch all supported liquidity pools2 with pagination.",
    })
    async liquidityPools2(
        @Args("request", {
            description: "Input parameters required to identify which liquidity pools2 should be fetched.",
        })
            request: LiquidityPools2Request,
    ): Promise<LiquidityPools2ResponseData> {
        return this.liquidityPools2Service.liquidityPools2(request)
    }
}

