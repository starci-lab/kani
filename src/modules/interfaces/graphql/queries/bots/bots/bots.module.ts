import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bots.module-definition"
import { BotsService } from "./bots.service"
import { BotsResolver } from "./bots.resolver"
import { ProfitService, ValidateService } from "../../../services"

@Module({
    providers: [
        BotsService,
        BotsResolver,
        ProfitService,
        ValidateService,
    ],
})
export class BotsModule extends ConfigurableModuleClass {}

