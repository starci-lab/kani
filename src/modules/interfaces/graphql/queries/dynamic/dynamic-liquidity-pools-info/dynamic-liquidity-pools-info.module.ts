import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./dynamic-liquidity-pools-info.module-definition"
import { DynamicLiquidityPoolsInfoService } from "./dynamic-liquidity-pools-info.service"
import { DynamicLiquidityPoolsInfoResolver } from "./dynamic-liquidity-pools-info.resolver"

@Module({
    providers: [
        DynamicLiquidityPoolsInfoService,
        DynamicLiquidityPoolsInfoResolver,
    ],
})
export class DynamicLiquidityPoolsInfoModule extends ConfigurableModuleClass {}

