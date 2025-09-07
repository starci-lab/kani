
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./seeders.module-definition"
import { SeedersService } from "./seeder.service"
import { TokenSeeder, DexSeeder, LiquidityPoolSeeder } from "./data"

@Module({
    providers: [
        TokenSeeder, 
        DexSeeder,
        LiquidityPoolSeeder,
        SeedersService
    ],
})
export class SeedersModule extends ConfigurableModuleClass {
}
