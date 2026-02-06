import {
    Module,
} from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./dynamic-liquidity-pool-info.module-definition"
import {
    DynamicLiquidityPoolInfoGateway,
} from "./dynamic-liquidity-pool-info.gateway"

@Module({
    providers: [
        DynamicLiquidityPoolInfoGateway,
    ],
})
export class DynamicLiquidityPoolInfoModule extends ConfigurableModuleClass {}


