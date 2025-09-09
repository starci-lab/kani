import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./seeders.module-definition"
import { SqliteSeedersService } from "./seeder.service"
import { DexSeeder, LiquidityPoolSeeder, TokenSeeder } from "./data"

@Module({
    providers: [TokenSeeder, DexSeeder, LiquidityPoolSeeder, SqliteSeedersService],
    exports: [SqliteSeedersService]
})
export class SqliteSeedersModule extends ConfigurableModuleClass {}
