import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bots.module-definition"
import { BotsService } from "../bots/bots.service"
import { BotsResolver } from "../bots/bots.resolver"
import { ProfitService } from "../services"

@Module({
    providers: [
        BotsService,
        BotsResolver,
        ProfitService,
    ],
})
export class BotsModule extends ConfigurableModuleClass {}

