import { Args, Query, Resolver } from "@nestjs/graphql"
import { DynamicLiquidityPoolsInfoService } from "./dynamic-liquidity-pools-info.service"
import { GraphQLSuccessMessage } from "../../../interceptors"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { 
    DynamicLiquidityPoolInfo, 
    DynamicLiquidityPoolsInfoRequest, 
    DynamicLiquidityPoolsInfoResponse 
} from "./dynamic-liquidity-pools-info.dto"
import { GraphQLTransformInterceptor } from "../../../interceptors"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { GraphQLJwtAccessTokenAuthGuard } from "@modules/passport"

/**
 * GraphQL resolver for serving dynamic reference data
 * such as dynamic liquidity pools info.
 */
@Resolver()
export class DynamicLiquidityPoolsInfoResolver {
    constructor(
        private readonly dynamicLiquidityPoolsInfoService: DynamicLiquidityPoolsInfoService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Dynamic liquidity pools info fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => DynamicLiquidityPoolsInfoResponse, {
        description: "Fetch all dynamic liquidity pools.",
    })
    async dynamicLiquidityPoolsInfo(
        @Args("request") request: DynamicLiquidityPoolsInfoRequest,
    ): Promise<Array<DynamicLiquidityPoolInfo>> {
        return this.dynamicLiquidityPoolsInfoService.dynamicLiquidityPoolsInfo(request)
    }
}

