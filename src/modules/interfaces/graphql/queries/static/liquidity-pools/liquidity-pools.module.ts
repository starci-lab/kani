import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./liquidity-pools.module-definition"
import { LiquidityPoolsService } from "./liquidity-pools.service"
import { LiquidityPoolsResolver } from "./liquidity-pools.resolver"

@Module({
    providers: [
        LiquidityPoolsService,
        LiquidityPoolsResolver,
    ],
})
export class LiquidityPoolsModule extends ConfigurableModuleClass {}

