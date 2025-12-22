import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./bots2.module-definition"
import { Bots2Service } from "./bots2.service"
import { Bots2Resolver } from "./bots2.resolver"

@Module({
    providers: [
        Bots2Service,
        Bots2Resolver,
    ],
})
export class Bots2Module extends ConfigurableModuleClass {}

