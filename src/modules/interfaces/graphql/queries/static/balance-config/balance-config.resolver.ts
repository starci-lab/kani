import { Query, Resolver } from "@nestjs/graphql"
import { BalanceConfigService } from "./balance-config.service"
import { GraphQLSuccessMessage } from "../../../interceptors"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { BalanceConfigResponse } from "./balance-config.dto"    
import { GraphQLTransformInterceptor } from "../../../interceptors"
import { UseInterceptors } from "@nestjs/common"
import { BalanceConfig } from "@modules/databases"

@Resolver()
export class BalanceConfigResolver {
    constructor(
        private readonly balanceConfigService: BalanceConfigService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Balance config fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => BalanceConfigResponse, {
        description: "Fetch the balance config.",
    })
    balanceConfig(): BalanceConfig {
        return this.balanceConfigService.balanceConfig()
    }
}

