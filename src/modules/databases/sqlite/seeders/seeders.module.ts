import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./seeders.module-definition"
import { SeedersService } from "./seeder.service"
import { DexSeeder, LiquidityPoolSeeder, TokenSeeder } from "./data"

@Module({
    providers: [TokenSeeder, DexSeeder, LiquidityPoolSeeder, SeedersService],
})
export class SeedersModule extends ConfigurableModuleClass {}
