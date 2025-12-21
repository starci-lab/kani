import { Query, Resolver } from "@nestjs/graphql"
import { LiquidityPoolsService } from "./liquidity-pools.service"
import { GraphQLSuccessMessage } from "../../../interceptors"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { LiquidityPoolsResponse } from "./liquidity-pools.dto"    
import { LiquidityPoolSchema } from "@modules/databases"
import { GraphQLTransformInterceptor } from "../../../interceptors"
import { UseInterceptors } from "@nestjs/common"

@Resolver()
export class LiquidityPoolsResolver {
    constructor(
        private readonly liquidityPoolsService: LiquidityPoolsService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Liquidity pools fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => LiquidityPoolsResponse, {
        description: "Fetch all supported liquidity pools.",
    })
    async liquidityPools(): Promise<Array<LiquidityPoolSchema>> {
        return this.liquidityPoolsService.liquidityPools()
    }
}

