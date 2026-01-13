import { Query, Resolver } from "@nestjs/graphql"
import { GasConfigService } from "./gas-config.service"
import { GraphQLSuccessMessage } from "../../../interceptors"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GasConfigResponse } from "./gas-config.dto"    
import { GasConfig } from "@modules/databases"
import { GraphQLTransformInterceptor } from "../../../interceptors"
import { UseInterceptors } from "@nestjs/common"

@Resolver()
export class GasConfigResolver {
    constructor(
        private readonly gasConfigService: GasConfigService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Gas config fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => GasConfigResponse, {
        description: "Fetch the gas config.",
    })
    gasConfig(): GasConfig {
        return this.gasConfigService.gasConfig()
    }
}

