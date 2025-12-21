import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./positions2.module-definition"
import { Positions2Service } from "./positions2.service"
import { Positions2Resolver } from "./positions2.resolver"

@Module({
    providers: [
        Positions2Service,
        Positions2Resolver,
    ],
})
export class Positions2Module extends ConfigurableModuleClass {}

