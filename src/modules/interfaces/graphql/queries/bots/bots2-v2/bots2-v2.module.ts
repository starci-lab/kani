import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bots2-v2.module-definition"
import { Bots2V2Service } from "./bots2-v2.service"
import { Bots2V2Resolver } from "./bots2-v2.resolver"
import { ProfitService } from "../services"

@Module({
    providers: [
        Bots2V2Service,
        Bots2V2Resolver,
        ProfitService,
    ],
})
export class Bots2V2Module extends ConfigurableModuleClass {}

