import { Module } from "@nestjs/common"
import { LiquidityProvisionService } from "./liquidity-provision.service"
import { ConfigurableModuleClass } from "./liquidity-provision.module-definition"
import { LiquidityProvisionResolver } from "./liquidity-provision.resolvers"

@Module({
    providers: [LiquidityProvisionService, LiquidityProvisionResolver],
})
export class LiquidityProvisionModule extends ConfigurableModuleClass {}