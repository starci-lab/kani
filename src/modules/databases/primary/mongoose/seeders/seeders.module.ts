
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./seeders.module-definition"
import { SeedersService } from "./seeder.service"
import { TokenSeeder, DexSeeder, LiquidityPoolSeeder, ConfigSeeder } from "./data"

@Module({
    providers: [
        TokenSeeder, 
        DexSeeder,
        LiquidityPoolSeeder,
        ConfigSeeder,
        SeedersService
    ],
})
export class SeedersModule extends ConfigurableModuleClass {
}
