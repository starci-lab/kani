import { Module } from "@nestjs/common"
import { SeedersService } from "./seeders.service"
import { ConfigurableModuleClass } from "./seeders.module-definition"
import { DexesService } from "./dexes.service"
import { TokensService } from "./tokens.service"
import { LiquidityPoolsService } from "./liquidity-pools.service"

@Module({
    providers: [
        TokensService,
        DexesService,
        LiquidityPoolsService,
        SeedersService
    ],
    exports: [
        SeedersService
    ]
})
export class SeedersModule extends ConfigurableModuleClass {
}