import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./seeders.module-definition"
import { SeedersService } from "./seeder.service"
import { DexSeeder, LpPoolSeeder, TokenSeeder } from "./data"

@Module({
    providers: [TokenSeeder, DexSeeder, LpPoolSeeder, SeedersService],
})
export class SeedersModule extends ConfigurableModuleClass {}
