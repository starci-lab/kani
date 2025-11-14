import { Query, Resolver } from "@nestjs/graphql"
import { StaticService } from "./static.service"
import { GraphQLSuccessMessage } from "../../interceptors"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { DexesResponse, LiquidityPoolsResponse, TokensResponse } from "./static.dto"    
import { DexSchema, LiquidityPoolSchema, TokenSchema } from "@modules/databases"
import { GraphQLTransformInterceptor } from "../../interceptors"
import { UseInterceptors } from "@nestjs/common"

/**
 * GraphQL resolver for serving static reference data
 * such as tokens, liquidity pools, and DEX metadata.
 */
@Resolver()
export class StaticResolver {
    constructor(
        private readonly staticService: StaticService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Tokens fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => TokensResponse, {
        description: "Fetch all supported tokens.",
    })
    tokens(): Array<TokenSchema> {
        return this.staticService.tokens()
    }

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Liquidity pools fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => LiquidityPoolsResponse, {
        description: "Fetch all supported liquidity pools.",
    })
    liquidityPools(): Array<LiquidityPoolSchema> {
        return this.staticService.liquidityPools()
    }

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("DEXes fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => DexesResponse, {
        description: "Fetch all supported DEXes.",
    })
    dexes(): Array<DexSchema> {
        return this.staticService.dexes()
    }

    // @UseThrottler(ThrottlerConfig.Soft)
    // @GraphQLSuccessMessage("Gas config fetched successfully")
    // @UseInterceptors(GraphQLTransformInterceptor)
    // @Query(() => GasConfigResponse, {
    //     description: "Fetch the gas configuration for the platform.",
    // })
    // gasConfig(): GasConfig {
    //     return this.staticService.gasConfig()
    // }
}   