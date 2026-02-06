import {
    Args, Query, Resolver 
} from "@nestjs/graphql"
import {
    LiquidityPoolsService 
} from "./liquidity-pools.service"
import {
    GraphQLSuccessMessage 
} from "@modules/api"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    LiquidityPoolsRequest, LiquidityPoolsResponse, LiquidityPoolsResponseData 
} from "./graphql-types"    
import {
    GraphQLTransformInterceptor 
} from "@modules/api"
import {
    UseInterceptors 
} from "@nestjs/common"

@Resolver()
export class LiquidityPoolsResolver {
    constructor(
        private readonly liquidityPoolsService: LiquidityPoolsService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Liquidity pools fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => LiquidityPoolsResponse,
        {
            description: "Fetch all supported liquidity pools with pagination.",
        })
    async liquidityPools(
        @Args("request",
            {
                description: "Input parameters required to identify which liquidity pools should be fetched.",
            })
            request: LiquidityPoolsRequest,
    ): Promise<LiquidityPoolsResponseData> {
        return this.liquidityPoolsService.liquidityPools(request)
    }
}

