import { Args, Query, Resolver } from "@nestjs/graphql"
import { DynamicService } from "./dynamic.service"
import { GraphQLSuccessMessage } from "../../interceptors"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { 
    DynamicLiquidityPoolInfo, 
    DynamicLiquidityPoolsInfoRequest, 
    DynamicLiquidityPoolsInfoResponse 
} from "./dynamic.dto"
import { GraphQLTransformInterceptor } from "../../interceptors"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { GraphQLPrivyAuthGuard } from "@modules/passport"

/**
 * GraphQL resolver for serving static reference data
 * such as tokens, liquidity pools, and DEX metadata.
 */
@Resolver()
export class DynamicResolver {
    constructor(
        private readonly dynamicService: DynamicService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Liquidity pools fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLPrivyAuthGuard)
    @Query(() => DynamicLiquidityPoolsInfoResponse, {
        description: "Fetch all dynamic liquidity pools.",
    })
    async dynamicLiquidityPoolsInfo(
        @Args("request") request: DynamicLiquidityPoolsInfoRequest,
    ): Promise<Array<DynamicLiquidityPoolInfo>> {
        return this.dynamicService.dynamicLiquidityPoolsInfo(request)
    }
}   