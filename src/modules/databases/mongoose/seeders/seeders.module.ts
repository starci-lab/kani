
import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./seeders.module-definition"
import { SeedersService } from "./seeder.service"
import { TokenSeeder } from "./data"

@Module({
    providers: [TokenSeeder, SeedersService],
})
export class SeedersModule extends ConfigurableModuleClass {
}
