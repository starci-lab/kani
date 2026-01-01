import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./static.module-definition"
import { TokensModule } from "./tokens"
import { LiquidityPoolsModule } from "./liquidity-pools"
import { DexesModule } from "./dexes"
import { AccountLimitsModule } from "./account-limits"

@Module({
    imports: [
        TokensModule.register({
            isGlobal: true,
        }),
        LiquidityPoolsModule.register({
            isGlobal: true,
        }),
        DexesModule.register({
            isGlobal: true,
        }),
        AccountLimitsModule.register({
            isGlobal: true,
        }),
    ],
})
export class StaticModule extends ConfigurableModuleClass {}