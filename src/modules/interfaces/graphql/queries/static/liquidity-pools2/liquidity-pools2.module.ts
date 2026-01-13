import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./liquidity-pools2.module-definition"
import { LiquidityPools2Service } from "./liquidity-pools2.service"
import { LiquidityPools2Resolver } from "./liquidity-pools2.resolver"
import { AttachDynamicInfoService } from "../../../services"

@Module({
    providers: [
        LiquidityPools2Service,
        LiquidityPools2Resolver,
        AttachDynamicInfoService,
    ],
})
export class LiquidityPools2Module extends ConfigurableModuleClass {}

