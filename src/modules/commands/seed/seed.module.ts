
import { Module } from "@nestjs/common"
import {
    ConfigurableModuleClass,
} from "./seed.module-definition"
import { SeedCommand } from "./seed.command"
@Module({
    providers: [
        SeedCommand,
    ],
})
export class SeedModule extends ConfigurableModuleClass {}
