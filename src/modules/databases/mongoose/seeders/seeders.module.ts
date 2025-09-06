
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./seeders.module-definition"
import { SeedersService } from "./seeder.service"
import { TokenSeeder, DexSeeder, LpPoolSeeder } from "./data"

@Module({
    providers: [
        TokenSeeder, 
        DexSeeder,
        LpPoolSeeder,
        SeedersService
    ],
})
export class SeedersModule extends ConfigurableModuleClass {
}
