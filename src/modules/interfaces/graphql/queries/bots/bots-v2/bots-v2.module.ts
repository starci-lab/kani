import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bots-v2.module-definition"
import { BotsV2Service } from "./bots-v2.service"
import { BotsV2Resolver } from "./bots-v2.resolver"
import { ProfitService, ValidateService } from "../../../services"

@Module({
    providers: [
        BotsV2Service,
        BotsV2Resolver,
        ProfitService,
        ValidateService,
    ],
})
export class BotsV2Module extends ConfigurableModuleClass {}

