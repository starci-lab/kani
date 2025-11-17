import { Module } from "@nestjs/common"
import { SeedersService } from "./seeders.service"
import { ConfigurableModuleClass } from "./seeders.module-definition"
import { DexesService } from "./dexes.service"
import { TokensService } from "./tokens.service"
import { LiquidityPoolsService } from "./liquidity-pools.service"
import { ConfigService } from "./config.service"

@Module({
    providers: [
        TokensService,
        DexesService,
        LiquidityPoolsService,
        ConfigService,
        SeedersService
    ],
    exports: [
        SeedersService
    ]
})
export class SeedersModule extends ConfigurableModuleClass {
}