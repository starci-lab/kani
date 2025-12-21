import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./static.module-definition"
import { TokensModule } from "./tokens"
import { LiquidityPoolsModule } from "./liquidity-pools"
import { DexesModule } from "./dexes"

@Module({
    imports: [
        TokensModule.register({}),
        LiquidityPoolsModule.register({}),
        DexesModule.register({}),
    ],
})
export class StaticModule extends ConfigurableModuleClass {}