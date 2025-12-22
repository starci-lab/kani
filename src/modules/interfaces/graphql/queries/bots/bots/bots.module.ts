import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bots.module-definition"
import { BotsService } from "./bots.service"
import { BotsResolver } from "./bots.resolver"

@Module({
    providers: [
        BotsService,
        BotsResolver,
    ],
})
export class BotsModule extends ConfigurableModuleClass {}

