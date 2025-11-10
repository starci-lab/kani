import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./mutations.module-definition"
import { AuthModule } from "./auth"
import { LiquidityProvisionModule } from "./liquidity-provision"

@Module({
    imports: [
        AuthModule.register({}),
        LiquidityProvisionModule.register({}),
    ],
})
export class MutationsModule extends ConfigurableModuleClass {}