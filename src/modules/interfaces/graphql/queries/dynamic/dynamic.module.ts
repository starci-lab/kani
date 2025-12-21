import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./dynamic.module-definition"
import { DynamicLiquidityPoolsInfoModule } from "./dynamic-liquidity-pools-info"

@Module({
    imports: [
        DynamicLiquidityPoolsInfoModule.register({}),
    ],
})
export class DynamicGraphQLModule extends ConfigurableModuleClass {}